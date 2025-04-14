/** *******************************************************************************************************************
  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

  Licensed under the Apache License, Version 2.0 (the "License").
  You may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
 ******************************************************************************************************************** */
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelCommandInput,
  InvokeModelCommandOutput,
} from '@aws-sdk/client-bedrock-runtime';

enum SupportedModel {
  CLAUDE_V2 = 'anthropic.claude-v2',
  CLAUDE_3_SONNET = 'anthropic.claude-3-sonnet-20240229-v1:0',
  CLAUDE_3_HAIKU = 'anthropic.claude-3-haiku-20240307-v1:0',
  LLAMA_70B = 'meta.llama2-70b-chat-v1',
}

/**
 * All requests must include a user-provided string,  i.e. the prompt.
 */
export interface ModelRequest {
  prompt: string;
}

/**
 * Marker interface for model responses.
 */
export interface ModelResponse {
}

/**
 * ClaudeV2 request type.
 */
interface ClaudeV2Request extends ModelRequest {
  max_tokens_to_sample: number;
  temperature: number;
  top_p: number;
}

interface ClaudeV2Response extends ModelResponse {
  completion: string;
  stop_reason?: string;
  stop?: string;
}

export type RequestTypeFor<T extends SupportedModel> =
  T extends SupportedModel.CLAUDE_V2 ? ClaudeV2Request :
    never;

export type ResponseTypeFor<T extends SupportedModel> =
  T extends SupportedModel.CLAUDE_V2 ? ClaudeV2Response :
    never;

/**
 * All clients must handle their request and response type based on the model being invoked. The base client holds
 * default params for injecting into the request as well as the actual SDK client.
 */
abstract class BedrockModelClient<T extends SupportedModel> {

  protected readonly defaultParams: Partial<RequestTypeFor<T>>;
  protected readonly runtimeClient: BedrockRuntimeClient;
  protected readonly model: SupportedModel;

  protected constructor(defaultParams: Partial<RequestTypeFor<T>>,
    client: BedrockRuntimeClient,
    model: SupportedModel) {
    this.defaultParams = defaultParams;
    this.runtimeClient = client;
    this.model = model;
  }

  /**
   * Simple single-request invocation.
   * @param request The model-specific request
   */
  public async invoke(request: string): Promise<string> {
    const formattedReq = this.formRequest(request);
    const resp = await this.invokeClient(formattedReq);
    if (resp.body) {
      const responseBody = JSON.parse(new TextDecoder().decode(resp.body)) as ResponseTypeFor<T>;
      return this.formResponse(responseBody);
    } else {
      throw new Error('Invalid response received from Bedrock', resp.body);
    }
  }

  protected async invokeClient(req: RequestTypeFor<T>): Promise<InvokeModelCommandOutput> {
    try {
      const command = new InvokeModelCommand({
        modelId: this.model,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(this.formRequest(req.prompt)),
      } as InvokeModelCommandInput);

      return await
      this.runtimeClient.send(command);

    } catch (error) {
      console.error('Error invoking Bedrock model:', error);
      throw error;
    }
  }


  protected abstract formRequest(prompt: string): RequestTypeFor<T>;

  protected abstract formResponse(resp: ResponseTypeFor<T>): string;

}

/**
 * Implementation of BedrockClient for ClaudeV2.
 */
class ClaudeV2Client extends BedrockModelClient<SupportedModel.CLAUDE_V2> {

  private static readonly DEFAULT_BASE_PROMPT = 'You are an expert threat modeler working on AWS Threat Composer, an open-source project by AWS. \
 You are helping security engineers and developers keep their software safe. \
 Please generate sample data in the format provided. \
 Keep reader legibility and user experience in mind. \
 DO NOT include any tokens or information in your response at all except the exact data requested in the exact schema requested. \
 You will be provided schemas with examples below. \
';

  private static readonly DEFAULT_MAX_TOKENS_TO_SAMPLE = 5000;

  private static readonly DEFAULT_TEMPERATURE = .7;

  private static readonly DEFAULT_TOP_P = .9;

  public constructor(defaultParams?: Partial<ClaudeV2Request>, client?: BedrockRuntimeClient) {
    // TODO: Expose creds and allow more flexibility
    super(defaultParams ?? {}, client ?? new BedrockRuntimeClient(), SupportedModel.CLAUDE_V2);
  }

  protected override formRequest(prompt: string): ClaudeV2Request {
    const baseParams = {
      prompt: this.defaultParams?.prompt
        ?? ClaudeV2Client.DEFAULT_BASE_PROMPT,
      max_tokens_to_sample: this.defaultParams?.max_tokens_to_sample
        ?? ClaudeV2Client.DEFAULT_MAX_TOKENS_TO_SAMPLE,
      temperature: this.defaultParams?.temperature
        ?? ClaudeV2Client.DEFAULT_TEMPERATURE,
      top_p: this.defaultParams?.top_p
        ?? ClaudeV2Client.DEFAULT_TOP_P,
    };
    return {
      ...baseParams,
      prompt: `Human: ${baseParams.prompt + prompt}\n\nAssistant:`,
    };
  }

  protected override formResponse(resp: ResponseTypeFor<SupportedModel.CLAUDE_V2>): string {
    return resp.completion;
  }

}

/**
Wire things up here.
 */
const getBedrockClient = (model: SupportedModel) => {
  switch (model) {
    case SupportedModel.CLAUDE_V2:
      return new ClaudeV2Client();
    default:
      throw new Error('Model not supported yet!');
  }
};

export { getBedrockClient, BedrockModelClient, ClaudeV2Client, SupportedModel };
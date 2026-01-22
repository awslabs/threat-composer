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

export interface TCJSONSimplifiedSchema {
  schema?: string;
}

export interface BaseIntegrationState {
  stopProcessing: boolean;
}

export interface SPAIntegrationState extends BaseIntegrationState {
  previousUrl: string;
  retryCount: number;
  isRetrying: boolean;
}

export interface TCAmazonCodeState extends BaseIntegrationState {}

export interface TCCodeCatalystState extends SPAIntegrationState {}

export interface TCBitbucketState extends SPAIntegrationState {}

export interface TCGitHubState extends SPAIntegrationState {}

export interface TCGitLabState extends SPAIntegrationState {}

export interface IntegrationHandler {
  handle(): Promise<void>;
  cleanup(): void;
}

export interface ButtonInsertionResult {
  button: HTMLElement;
  success: boolean;
}

export interface ContentExtractionResult {
  content: string | null;
  source: 'dom' | 'fetch' | 'none';
}

export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  operationName?: string;
}

export interface DOMWaitOptions {
  maxWaitTime?: number;
  checkInterval?: number;
}

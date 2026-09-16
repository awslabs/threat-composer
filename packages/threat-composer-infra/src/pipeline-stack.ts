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
import { PDKPipeline, PDKPipelineWithCodeConnection } from '@aws/pdk/pipeline';
import { Stack, StackProps } from 'aws-cdk-lib';
import { BuildSpec, ComputeType } from 'aws-cdk-lib/aws-codebuild';
import { Construct } from 'constructs';

export class PipelineStack extends Stack {
  readonly pipeline: PDKPipeline;

  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    const useCodeConnection = String(this.node.tryGetContext('useCodeConnection')) === 'true';
    const repositoryName = this.node.tryGetContext('repositoryName') || 'threat_composer_monorepo';
    const repositoryOwnerAndName = this.node.tryGetContext('repositoryOwnerAndName');
    const codeConnectionArn = this.node.tryGetContext('codeConnectionArn');

    const pipelineProps = {
      primarySynthDirectory: 'packages/threat-composer-infra/cdk.out',
      defaultBranchName: 'main',
      publishAssetsInParallel: false,
      crossAccountKeys: true,
      synth: {},
      // PDKPipeline's default synth step runs `npx projen install` and
      // `npx projen build`, which no longer exist here. CodeBuild's standard
      // images ship yarn but not pnpm, so install it first; pnpm 10 then
      // manages its own exact version from the packageManager field in the
      // root package.json. `pnpm build` runs every nx build target, which
      // includes lint and tests, and leaves cdk.out in primarySynthDirectory.
      synthShellStepPartialProps: {
        installCommands: ['npm install -g pnpm@10', 'pnpm install --frozen-lockfile'],
        commands: ['pnpm build'],
      },
      sonarCodeScannerConfig: this.node.tryGetContext('sonarqubeScannerConfig'),
      codeBuildDefaults: {
        buildEnvironment: {
          computeType: ComputeType.LARGE,
        },
        partialBuildSpec: BuildSpec.fromObject({
          phases: {
            install: {
              'runtime-versions': {
                // Matches CI and the Dockerfile. engines.node is
                // ^20.19.0 || ^22.13.0 || >=24 and Vite 8 enforces that floor,
                // so a 20.x runtime older than 20.19 would fail here while CI
                // stayed green. nodejs 24 is provided by the Ubuntu 22.04
                // standard:7.0 image that CodeBuildStep resolves to; the
                // runtime sets are not newest-wins (18 and 20 are on 7.0 but
                // not on 8.0), so this was checked against the CodeBuild
                // available-runtimes documentation rather than assumed.
                nodejs: '24',
              },
            },
          },
        }),
      },
    };

    if (useCodeConnection) {
      this.pipeline = new PDKPipelineWithCodeConnection(this, 'ApplicationPipeline', {
        ...pipelineProps,
        repositoryOwnerAndName: repositoryOwnerAndName,
        codeConnectionArn: codeConnectionArn,
      });
    } else {
      this.pipeline = new PDKPipeline(this, 'ApplicationPipeline', {
        ...pipelineProps,
        repositoryName: repositoryName,
      });
    }
  }
}

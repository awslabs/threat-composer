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
import { PDKNag } from '@aws/pdk/pdk-nag';
import { ManualApprovalStep } from 'aws-cdk-lib/pipelines';
import { ApplicationStage } from './application-stage';
import { STAGE_PREFIX_IDE_EXTENSION_ENV } from './constants';
import { PipelineStack } from './pipeline-stack';

const app = PDKNag.app();

const pipelineAccount =
  app.node.tryGetContext('accountPipeline') || process.env.CDK_DEFAULT_ACCOUNT;
const devAccount =
  app.node.tryGetContext('accountDev') || process.env.CDK_DEFAULT_ACCOUNT;
const prodAccount = app.node.tryGetContext('accountProd');
const region = process.env.CDK_DEFAULT_REGION;

const pipelineStack = new PipelineStack(app, 'ThreatComposerInfraStack', {
  env: {
    account: pipelineAccount,
    region: region,
  },
});

if (devAccount) {
  const devStage = new ApplicationStage(app, 'Dev', {
    env: {
      account: devAccount,
      region,
    },
  });

  pipelineStack.pipeline.addStage(devStage);
}

if (prodAccount) {
  const prodStage = new ApplicationStage(app, 'Prod', {
    env: {
      account: prodAccount,
      region,
    },
  });

  pipelineStack.pipeline.addStage(prodStage, {
    pre: [new ManualApprovalStep('Prod Deployment Approval')],
  });
}

const ideExtensionDevAccount =
  app.node.tryGetContext(`account${STAGE_PREFIX_IDE_EXTENSION_ENV}Dev`) || process.env.CDK_DEFAULT_ACCOUNT;
const ideExtensionProdAccount = app.node.tryGetContext(`account${STAGE_PREFIX_IDE_EXTENSION_ENV}Prod`);

if (ideExtensionDevAccount) {
  new ApplicationStage(app, `${STAGE_PREFIX_IDE_EXTENSION_ENV}Dev`, {
    env: {
      account: ideExtensionDevAccount,
      region,
    },
  });
}

if (ideExtensionProdAccount) {
  new ApplicationStage(app, `${STAGE_PREFIX_IDE_EXTENSION_ENV}Prod`, {
    env: {
      account: ideExtensionProdAccount,
      region,
    },
  });
}

pipelineStack.pipeline.buildPipeline(); // Needed for CDK Nag

app.synth();

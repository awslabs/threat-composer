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
import { ManualApprovalStep } from "aws-cdk-lib/pipelines";
import { PDKNag } from "aws-prototyping-sdk/pdk-nag";
import { ApplicationStage } from "./application-stage";
import { PipelineStack } from "./pipeline-stack";

const app = PDKNag.app();

const pipelineAccount = "712233877849"; // Replace with Pipeline account
const devAccount = "343732677492"; // Replace with Dev account
const prodAccount = "817772320334"; // Replace with Prod account
const region = "us-west-2";

const pipelineStack = new PipelineStack(
  app,
  "ThreatStatementGeneratorInfraStack",
  {
    env: {
      account: pipelineAccount,
      region: region,
    },
  }
);

const devStage = new ApplicationStage(app, "Dev", {
  env: {
    account: devAccount,
    region,
  },
});

pipelineStack.pipeline.addStage(devStage);

const prodStage = new ApplicationStage(app, "Prod", {
  env: {
    account: prodAccount,
    region,
  },
});

pipelineStack.pipeline.addStage(prodStage, {
  pre: [new ManualApprovalStep("Prod Deployment Approval")],
});

pipelineStack.pipeline.buildPipeline(); // Needed for CDK Nag

app.synth();

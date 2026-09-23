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
import { fileURLToPath } from 'node:url';
import { App, Aspects, Stack } from 'aws-cdk-lib';
import { Annotations, Match, Template } from 'aws-cdk-lib/assertions';
import { Source } from 'aws-cdk-lib/aws-s3-deployment';
import { AwsSolutionsChecks } from 'cdk-nag';
import { ApplicationStage } from '../src/application-stage';
import { PipelineStack } from '../src/pipeline-stack';

test.each([
  { crossAccount: false, useCodeConnection: false },
  { crossAccount: false, useCodeConnection: true },
  { crossAccount: true, useCodeConnection: false },
  { crossAccount: true, useCodeConnection: true },
])('real mixed-region stage passes nag (crossAccount=$crossAccount, connection=$useCodeConnection)', ({ crossAccount, useCodeConnection }) => {
  // Substitute only the website files, retaining the real stage, WAF, website,
  // cross-region references, asset publishers and generated support stack.
  const fixture = Source.asset(fileURLToPath(new URL('./fixtures/website', import.meta.url)));
  const sourceAsset = vi.spyOn(Source, 'asset').mockReturnValue(fixture);
  try {
    const app = new App({
      context: {
        useCodeConnection,
        repositoryOwnerAndName: 'owner/repo',
        codeConnectionArn: 'arn:aws:codestar-connections:us-west-2:111111111111:connection/00000000-0000-0000-0000-000000000000',
      },
    });
    Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }));
    const stack = new PipelineStack(app, 'ThreatComposerInfraStack', {
      env: { account: '111111111111', region: 'us-west-2' },
    });
    const stage = new ApplicationStage(app, 'Dev', {
      env: { account: crossAccount ? '222222222222' : '111111111111', region: 'us-west-2' },
    });
    const websiteStack = stage.node.findChild('ThreatComposerAppStack') as Stack;
    const wafStack = stage.node.findChild('ThreatComposerWebAclStack') as Stack;
    expect(websiteStack.region).toBe('us-west-2');
    expect(wafStack.region).toBe('us-east-1');
    expect(websiteStack.dependencies).toContain(wafStack);
    stack.pipeline.addStage(stage);
    stack.pipeline.buildPipeline();
    stack.suppressPipelineNagFindings();

    Annotations.fromStack(stack).hasNoError('*', Match.anyValue());
    const support = stack.pipeline.pipeline.crossRegionSupport['us-east-1'];
    expect(support).toBeDefined();
    Annotations.fromStack(support.stack).hasNoError('*', Match.anyValue());
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::CodePipeline::Pipeline', {
      ArtifactStores: Match.arrayWith([
        Match.objectLike({ Region: 'us-east-1' }),
        Match.objectLike({ Region: 'us-west-2' }),
      ]),
    });
    template.hasResourceProperties('AWS::S3::Bucket', {
      LoggingConfiguration: {
        DestinationBucketName: { Ref: 'ApplicationPipelineAccessLogsBucketAFC4E2E4' }, LogFilePrefix: 'access-logs',
      },
    });
    template.hasResourceProperties('AWS::KMS::Key', { EnableKeyRotation: true });
    const supportTemplate = Template.fromStack(support.stack);
    const resources = supportTemplate.toJSON().Resources;
    // Existing CDK-generated support resources must not move when adding logs.
    for (const id of [
      'CrossRegionCodePipelineReplicationBucketFC3227F2',
      'CrossRegionCodePipelineReplicationBucketPolicyB7BA2BCA',
      'CrossRegionCodePipelineReplicationBucketEncryptionKey70216490',
      'CrossRegionCodePipelineReplicationBucketEncryptionAliasF1A0F37D',
    ]) {
      expect(resources).toHaveProperty(id);
    }
    const replica = resources.CrossRegionCodePipelineReplicationBucketFC3227F2;
    expect(replica).toMatchObject({ DeletionPolicy: 'Retain', UpdateReplacePolicy: 'Retain' });
    expect(replica.Properties.BucketName).toBe('threatcomposerinfrastack-eplicationbucket5b0745763a0b8fdb1263');
    const logsId = replica.Properties.LoggingConfiguration.DestinationBucketName.Ref;
    expect(resources[logsId]).toMatchObject({
      DeletionPolicy: 'Retain',
      UpdateReplacePolicy: 'Retain',
      Properties: {
        BucketEncryption: { ServerSideEncryptionConfiguration: [{ ServerSideEncryptionByDefault: { SSEAlgorithm: 'AES256' } }] },
        OwnershipControls: { Rules: [{ ObjectOwnership: 'BucketOwnerEnforced' }] },
        PublicAccessBlockConfiguration: {
          BlockPublicAcls: true, BlockPublicPolicy: true, IgnorePublicAcls: true, RestrictPublicBuckets: true,
        },
      },
    });
    supportTemplate.hasResourceProperties('AWS::S3::BucketPolicy', {
      Bucket: { Ref: logsId },
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({ Effect: 'Deny', Condition: { Bool: { 'aws:SecureTransport': 'false' } } }),
          {
            Effect: 'Allow',
            Action: 's3:PutObject',
            Principal: { Service: 'logging.s3.amazonaws.com' },
            Resource: { 'Fn::Join': ['', [{ 'Fn::GetAtt': [logsId, 'Arn'] }, '/access-logs*']] },
            Condition: {
              ArnLike: { 'aws:SourceArn': { 'Fn::GetAtt': ['CrossRegionCodePipelineReplicationBucketFC3227F2', 'Arn'] } },
              StringEquals: { 'aws:SourceAccount': '111111111111' },
            },
          },
        ]),
      },
    });
    supportTemplate.hasResourceProperties('AWS::KMS::Key', { EnableKeyRotation: true });
    expect(replica.Properties.LoggingConfiguration).toEqual({
      DestinationBucketName: { Ref: logsId }, LogFilePrefix: 'access-logs',
    });
  } finally {
    sourceAsset.mockRestore();
  }
});

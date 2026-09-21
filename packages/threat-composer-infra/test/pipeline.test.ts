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
import { App, Aspects, Stack, Stage } from 'aws-cdk-lib';
import { Annotations, Match, Template } from 'aws-cdk-lib/assertions';
import { CfnKey } from 'aws-cdk-lib/aws-kms';
import { Bucket, CfnBucket } from 'aws-cdk-lib/aws-s3';
import { Asset } from 'aws-cdk-lib/aws-s3-assets';
import { AwsSolutionsChecks } from 'cdk-nag';
import { PipelineStack } from '../src/pipeline-stack';

// Captured from the pre-migration snapshot (1510ac9^), using PDK 0.26.15.
// These expectations must not be regenerated with the current snapshot.
const repositoryId = 'ApplicationPipelineCodeRepositoryA734F3FA';
const pipelineId = 'ApplicationPipelineCodePipeline92ED701F';
const artifactId = 'ApplicationPipelineArtifactsBucketD6B45A16';
const logsId = 'ApplicationPipelineAccessLogsBucketAFC4E2E4';
const keyId = 'ApplicationPipelineArtifactKey284E3A3C';
const artifactPolicyId = 'ApplicationPipelineArtifactsBucketPolicy0F22EB48';
const logsPolicyId = 'ApplicationPipelineAccessLogsBucketPolicy9D7CCAB8';
const providerRoleId = 'CustomS3AutoDeleteObjectsCustomResourceProviderRole3B1BD092';
const connectionArn = 'arn:aws:codestar-connections:us-west-2:111111111111:connection/00000000-0000-0000-0000-000000000000';

test('Snapshot', () => {
  const app = new App();
  const stack = new PipelineStack(app, 'pipeline-test', {});

  const template = Template.fromStack(stack);
  expect(template.toJSON()).toMatchSnapshot();
});

test.each([false, true])('preserves PDK pipeline identities and security (connection=%s)', (useCodeConnection) => {
  const app = new App({
    context: {
      useCodeConnection,
      repositoryOwnerAndName: 'owner/repo',
      codeConnectionArn: connectionArn,
    },
  });
  const stack = new PipelineStack(app, 'pipeline-test', {});
  const template = Template.fromStack(stack);
  const resources = template.toJSON().Resources;

  expect(Object.keys(template.findResources('AWS::CodePipeline::Pipeline'))).toEqual([pipelineId]);
  expect(Object.keys(template.findResources('AWS::S3::Bucket')).sort()).toEqual([logsId, artifactId].sort());
  expect(Object.keys(template.findResources('AWS::KMS::Key'))).toEqual([keyId]);
  expect(Object.keys(template.findResources('AWS::S3::BucketPolicy')).sort()).toEqual([logsPolicyId, artifactPolicyId].sort());
  for (const id of [
    'ApplicationPipelineCodeBuildActionRole98AD1444',
    'ApplicationPipelineCodeBuildActionRoleDefaultPolicyFE7AFEF3',
    'ApplicationPipelineCodePipelineRole53E5791D',
    'ApplicationPipelineCodePipelineRoleDefaultPolicy02E04067',
    'ApplicationPipelineCodePipelineBuildSynthCdkBuildProjectEE7ED66A',
    'ApplicationPipelineCodePipelineBuildSynthCdkBuildProjectRole75D1C6E6',
    'ApplicationPipelineCodePipelineBuildSynthCdkBuildProjectRoleDefaultPolicy4B9195CC',
    'ApplicationPipelineUpdatePipelineSelfMutation66D95DA8',
    'ApplicationPipelineUpdatePipelineSelfMutationRoleD476D3E4',
    'ApplicationPipelineUpdatePipelineSelfMutationRoleDefaultPolicyE74ACD15',
    'ApplicationPipelineAccessLogsBucketAutoDeleteObjectsCustomResource86C84D8B',
    'ApplicationPipelineArtifactsBucketAutoDeleteObjectsCustomResource349BB700',
    'CustomS3AutoDeleteObjectsCustomResourceProviderHandler9D90184F',
    providerRoleId,
  ]) {
    expect(resources).toHaveProperty(id);
  }

  for (const id of [artifactId, logsId, keyId]) {
    expect(resources[id]).toMatchObject({ DeletionPolicy: 'Delete', UpdateReplacePolicy: 'Delete' });
  }
  expect(resources[keyId].Properties).toEqual({
    EnableKeyRotation: true,
    KeyPolicy: {
      Version: '2012-10-17',
      Statement: [{
        Action: 'kms:*',
        Effect: 'Allow',
        Principal: { AWS: { 'Fn::Join': ['', ['arn:', { Ref: 'AWS::Partition' }, ':iam::', { Ref: 'AWS::AccountId' }, ':root']] } },
        Resource: '*',
      }],
    },
  });
  expect(resources[artifactId].Properties.LoggingConfiguration).toEqual({
    DestinationBucketName: { Ref: logsId },
    LogFilePrefix: 'access-logs',
  });
  expect(resources[logsId].Properties.LoggingConfiguration).toBeUndefined();

  for (const [id, policyId, ownership, encryption] of [
    [artifactId, artifactPolicyId, 'BucketOwnerEnforced', { SSEAlgorithm: 'aws:kms', KMSMasterKeyID: { 'Fn::GetAtt': [keyId, 'Arn'] } }],
    [logsId, logsPolicyId, 'ObjectWriter', { SSEAlgorithm: 'AES256' }],
  ] as const) {
    expect(resources[id].Properties).toMatchObject({
      BucketEncryption: { ServerSideEncryptionConfiguration: [{ ServerSideEncryptionByDefault: encryption }] },
      OwnershipControls: { Rules: [{ ObjectOwnership: ownership }] },
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true, BlockPublicPolicy: true, IgnorePublicAcls: true, RestrictPublicBuckets: true,
      },
    });
    expect(resources[policyId].Properties.Bucket).toEqual({ Ref: id });
    const bucketResources = [{ 'Fn::GetAtt': [id, 'Arn'] }, { 'Fn::Join': ['', [{ 'Fn::GetAtt': [id, 'Arn'] }, '/*']] }];
    const statements = [
      {
        Effect: 'Deny',
        Action: 's3:*',
        Principal: { AWS: '*' },
        Condition: { Bool: { 'aws:SecureTransport': 'false' } },
        Resource: bucketResources,
      },
      {
        Effect: 'Allow',
        Action: ['s3:PutBucketPolicy', 's3:GetBucket*', 's3:List*', 's3:DeleteObject*'],
        Principal: { AWS: { 'Fn::GetAtt': [providerRoleId, 'Arn'] } },
        Resource: bucketResources,
      },
    ];
    expect(resources[policyId].Properties.PolicyDocument.Statement).toEqual(id === logsId ? [
      ...statements,
      {
        Effect: 'Allow',
        Action: 's3:PutObject',
        Principal: { Service: 'logging.s3.amazonaws.com' },
        Condition: {
          ArnLike: { 'aws:SourceArn': { 'Fn::GetAtt': [artifactId, 'Arn'] } },
          StringEquals: { 'aws:SourceAccount': { Ref: 'AWS::AccountId' } },
        },
        Resource: { 'Fn::Join': ['', [{ 'Fn::GetAtt': [logsId, 'Arn'] }, '/access-logs*']] },
      },
    ] : statements);
  }

  expect(resources[pipelineId].Properties).toMatchObject({
    PipelineType: 'V1',
    RestartExecutionOnUpdate: true,
    ArtifactStore: {
      Type: 'S3',
      Location: { Ref: artifactId },
      EncryptionKey: { Type: 'KMS', Id: { 'Fn::GetAtt': [keyId, 'Arn'] } },
    },
  });
  for (const project of Object.values(template.findResources('AWS::CodeBuild::Project'))) {
    expect(project.Properties.EncryptionKey).toEqual({ 'Fn::GetAtt': [keyId, 'Arn'] });
  }

  const source = resources[pipelineId].Properties.Stages[0].Actions[0];
  if (useCodeConnection) {
    template.resourceCountIs('AWS::CodeCommit::Repository', 0);
    template.resourceCountIs('AWS::Events::Rule', 0);
    expect(source.ActionTypeId.Provider).toBe('CodeStarSourceConnection');
    expect(source.Configuration).toMatchObject({ ConnectionArn: connectionArn, FullRepositoryId: 'owner/repo', BranchName: 'main' });
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: Match.arrayWith([Match.objectLike({
          Action: 'codestar-connections:UseConnection', Resource: connectionArn, Effect: 'Allow',
        })]),
      },
    });
  } else {
    expect(Object.keys(template.findResources('AWS::CodeCommit::Repository'))).toEqual([repositoryId]);
    expect(resources[repositoryId]).toEqual({
      Type: 'AWS::CodeCommit::Repository',
      Properties: { RepositoryName: 'threat_composer_monorepo' },
      DeletionPolicy: 'Retain',
      UpdateReplacePolicy: 'Retain',
    });
    for (const id of [
      'ApplicationPipelineCodePipelineSourceCodeCommitCodePipelineActionRole0900531A',
      'ApplicationPipelineCodePipelineSourceCodeCommitCodePipelineActionRoleDefaultPolicyE92AF83A',
      'ApplicationPipelineCodePipelineEventsRoleCF718FC7',
      'ApplicationPipelineCodePipelineEventsRoleDefaultPolicy4A96451E',
      'ApplicationPipelineCodeRepositorypipelinetestApplicationPipelineCodePipeline31AB4045mainEventRuleF535C809',
    ]) {
      expect(resources).toHaveProperty(id);
    }
    template.hasOutput('ApplicationPipelineCodeRepositoryGRCUrl52F51C17', {});
    expect(source.ActionTypeId.Provider).toBe('CodeCommit');
    expect(source.Configuration).toEqual({
      RepositoryName: { 'Fn::GetAtt': [repositoryId, 'Name'] }, BranchName: 'main', PollForSourceChanges: false,
    });
  }
});

test.each([false, true])('passes pipeline nag with cross-account deployment (connection=%s)', (useCodeConnection) => {
  const app = new App({ context: { useCodeConnection, repositoryOwnerAndName: 'owner/repo', codeConnectionArn: connectionArn } });
  Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }));
  const stack = new PipelineStack(app, 'pipeline-test', { env: { account: '111111111111', region: 'us-west-2' } });
  const stage = new Stage(app, 'Prod', { env: { account: '222222222222', region: 'us-west-2' } });
  const deploymentStack = new Stack(stage, 'App');
  new Bucket(deploymentStack, 'DeploymentFixture');
  new Asset(deploymentStack, 'FileAssetFixture', { path: fileURLToPath(new URL('../src/constants.ts', import.meta.url)) });
  stack.pipeline.addStage(stage);
  stack.pipeline.buildPipeline();
  stack.suppressPipelineNagFindings();

  Annotations.fromStack(stack).hasNoError('*', Match.anyValue());
  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::CodeBuild::Project', 3);
  // Cross-account deploy roles still receive access to the same artifact bucket/key.
  const principal = { AWS: { 'Fn::Join': ['', ['arn:', { Ref: 'AWS::Partition' }, ':iam::222222222222:role/cdk-hnb659fds-deploy-role-222222222222-us-west-2']] } };
  template.hasResourceProperties('AWS::KMS::Key', {
    KeyPolicy: {
      Statement: Match.arrayWith([{
        Principal: principal, Action: ['kms:Decrypt', 'kms:DescribeKey'], Effect: 'Allow', Resource: '*',
      }]),
    },
  });
  template.hasResourceProperties('AWS::S3::BucketPolicy', {
    Bucket: { Ref: artifactId },
    PolicyDocument: {
      Statement: Match.arrayWith([Match.objectLike({
        Principal: principal, Action: ['s3:GetObject*', 's3:GetBucket*', 's3:List*'], Effect: 'Allow',
      })]),
    },
  });
});

test('artifact security regressions are not hidden by nag suppressions', () => {
  const app = new App();
  Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }));
  const stack = new PipelineStack(app, 'pipeline-test', {});
  stack.pipeline.buildPipeline();
  stack.suppressPipelineNagFindings();
  const bucket = stack.pipeline.pipeline.artifactBucket.node.defaultChild as CfnBucket;
  bucket.loggingConfiguration = undefined;
  const key = stack.pipeline.pipeline.artifactBucket.encryptionKey!.node.defaultChild as CfnKey;
  key.enableKeyRotation = false;
  Annotations.fromStack(stack).hasError('*', Match.stringLikeRegexp('AwsSolutions-S1:'));
  Annotations.fromStack(stack).hasError('*', Match.stringLikeRegexp('AwsSolutions-KMS5:'));
});

test.each(['repositoryOwnerAndName', 'codeConnectionArn'])('rejects a connection missing %s', (missing) => {
  const context: Record<string, string | boolean> = { useCodeConnection: true, repositoryOwnerAndName: 'owner/repo', codeConnectionArn: connectionArn };
  delete context[missing];
  expect(() => new PipelineStack(new App({ context }), 'pipeline-test', {})).toThrow('requires both');
});

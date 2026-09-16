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
import { CfnOutput, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { BuildSpec, ComputeType } from 'aws-cdk-lib/aws-codebuild';
import { Repository } from 'aws-cdk-lib/aws-codecommit';
import { Pipeline, PipelineType } from 'aws-cdk-lib/aws-codepipeline';
import { PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Key } from 'aws-cdk-lib/aws-kms';
import { BlockPublicAccess, Bucket, BucketEncryption, CfnBucket, ObjectOwnership } from 'aws-cdk-lib/aws-s3';
import { IFileSetProducer, ShellStep, CodePipeline, CodePipelineSource } from 'aws-cdk-lib/pipelines';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';

const DEFAULT_BRANCH_NAME = 'main';
const SYNTH_DIRECTORY = 'packages/threat-composer-infra/cdk.out';

/**
 * CI/CD pipeline for the Threat Composer website.
 *
 * This replaces `@aws/pdk`'s `PDKPipeline` / `PDKPipelineWithCodeConnection`
 * with the CDK's own `pipelines.CodePipeline`. The Sonar code scanner that
 * PDKPipeline could attach (`sonarqubeScannerConfig` context) is not carried
 * over; add a `CodeBuildStep` to `post` if that is needed again.
 */
export class PipelineStack extends Stack {
  readonly pipeline: CodePipeline;

  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    const useCodeConnection = String(this.node.tryGetContext('useCodeConnection')) === 'true';
    const repositoryName = this.node.tryGetContext('repositoryName') || 'threat_composer_monorepo';
    const repositoryOwnerAndName = this.node.tryGetContext('repositoryOwnerAndName');
    const codeConnectionArn = this.node.tryGetContext('codeConnectionArn');
    const branchName = this.node.tryGetContext('defaultBranchName') || DEFAULT_BRANCH_NAME;

    // Match PDK v0.26.15's paths, including the nested ApplicationPipeline below.
    // Moving these constructs would replace existing deployment resources.
    const pipelineScope = new Construct(this, 'ApplicationPipeline');
    pipelineScope.node.setContext('@aws-cdk/aws-s3:serverAccessLogsUseBucketPolicy', true);

    let source: IFileSetProducer;

    if (useCodeConnection) {
      if (!repositoryOwnerAndName || !codeConnectionArn) {
        throw new Error(
          'useCodeConnection requires both the repositoryOwnerAndName and codeConnectionArn context values.',
        );
      }

      source = CodePipelineSource.connection(repositoryOwnerAndName, branchName, {
        connectionArn: codeConnectionArn,
      });
    } else {
      const repository = new Repository(pipelineScope, 'CodeRepository', {
        repositoryName,
      });
      repository.applyRemovalPolicy(RemovalPolicy.RETAIN);

      source = CodePipelineSource.codeCommit(repository, branchName);
      new CfnOutput(pipelineScope, 'CodeRepositoryGRCUrl', {
        value: repository.repositoryCloneUrlGrc,
      });
    }

    const accessLogsBucket = new Bucket(pipelineScope, 'AccessLogsBucket', {
      versioned: false,
      enforceSSL: true,
      autoDeleteObjects: true,
      removalPolicy: RemovalPolicy.DESTROY,
      encryption: BucketEncryption.S3_MANAGED,
      objectOwnership: ObjectOwnership.OBJECT_WRITER,
      publicReadAccess: false,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
    });
    const artifactBucket = new Bucket(pipelineScope, 'ArtifactsBucket', {
      enforceSSL: true,
      autoDeleteObjects: true,
      removalPolicy: RemovalPolicy.DESTROY,
      encryption: BucketEncryption.KMS,
      encryptionKey: new Key(pipelineScope, 'ArtifactKey', {
        enableKeyRotation: true,
        removalPolicy: RemovalPolicy.DESTROY,
      }),
      objectOwnership: ObjectOwnership.BUCKET_OWNER_ENFORCED,
      publicReadAccess: false,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      serverAccessLogsPrefix: 'access-logs',
      serverAccessLogsBucket: accessLogsBucket,
    });
    const codePipeline = new Pipeline(pipelineScope, 'CodePipeline', {
      enableKeyRotation: true,
      restartExecutionOnUpdate: true,
      crossAccountKeys: true,
      artifactBucket,
      pipelineType: PipelineType.V1,
    });

    NagSuppressions.addResourceSuppressions(accessLogsBucket, [{
      id: 'AwsSolutions-S1',
      reason: 'This is the access-log destination; logging it to itself would create recursive logs.',
    }]);

    this.pipeline = new CodePipeline(pipelineScope, 'ApplicationPipeline', {
      codePipeline,
      publishAssetsInParallel: false,
      codeBuildDefaults: {
        buildEnvironment: {
          computeType: ComputeType.LARGE,
        },
        partialBuildSpec: BuildSpec.fromObject({
          phases: {
            install: {
              'runtime-versions': {
                // Matches the Node the rest of the repo builds on (CI and the
                // Dockerfile). This is not cosmetic: `engines.node` is
                // `^20.19.0 || ^22.13.0 || >=24`, and Vite 8 enforces that
                // floor at runtime, so a 20.x runtime older than 20.19 would
                // now fail here while CI stayed green.
                //
                // A runtime version the image does not provide fails the build
                // outright, so this was checked rather than assumed: nodejs 24
                // is available on Ubuntu 22.04 standard:7.0, which is the image
                // CodeBuildStep resolves to here. Note the runtime sets differ
                // per image and are not simply newest-wins -- 18 and 20 are on
                // 7.0 but not on 8.0.
                //
                // The image is not pinned explicitly, so it keeps receiving
                // security updates. It is recorded in the pipeline snapshot
                // test, so an aws-cdk-lib upgrade that moves off an image
                // carrying nodejs 24 shows up as a snapshot diff rather than a
                // pipeline failure.
                nodejs: '24',
              },
            },
          },
        }),
      },
      synth: new ShellStep('Synth', {
        input: source,
        // CodeBuild's standard images ship yarn but not pnpm. Installed
        // directly rather than through corepack: pnpm 10 manages its own
        // version from the packageManager field in the root package.json, so
        // the major below is all that needs stating here and the exact version
        // stays declared in one place.
        //
        // uv is needed too: the root postinstall runs `uv sync` for
        // packages/threat-composer-ai, and `pnpm build` runs its ruff and
        // pytest targets. The standard image has Python and pip, and pip puts
        // the uv binary on the PATH that later phases inherit; a curl-installed
        // uv would land in ~/.local/bin, which they do not.
        installCommands: [
          'npm install -g pnpm@10',
          'pip3 install uv',
          'pnpm install --frozen-lockfile',
        ],
        commands: ['pnpm build'],
        primaryOutputDirectory: SYNTH_DIRECTORY,
      }),
    });
  }

  /**
   * Configure generated replication logging and suppress generated IAM findings.
   *
   * Must be called after `pipeline.buildPipeline()`, because the roles and
   * policies these findings refer to do not exist until the pipeline is built.
   * S3 logging and KMS rotation are configured, not suppressed.
   */
  public suppressPipelineNagFindings() {
    NagSuppressions.addResourceSuppressions(
      this.pipeline.node.scope!,
      [{
        id: 'AwsSolutions-IAM5',
        reason: 'CDK-generated pipeline roles require wildcard grants for artifact objects, imported '
          + 'replication keys, build logs/report groups, self-mutation and bootstrap-role discovery. '
          + 'This preserves the prior generated-pipeline IAM exception, not a stack-wide exception.',
      }],
      true,
    );

    for (const { stack, replicationBucket } of Object.values(this.pipeline.pipeline.crossRegionSupport)) {
      const logs = new Bucket(stack, 'AccessLogsBucket', {
        encryption: BucketEncryption.S3_MANAGED,
        enforceSSL: true,
        blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
        objectOwnership: ObjectOwnership.BUCKET_OWNER_ENFORCED,
        removalPolicy: RemovalPolicy.RETAIN,
      });
      logs.addToResourcePolicy(new PolicyStatement({
        actions: ['s3:PutObject'],
        resources: [logs.arnForObjects('access-logs*')],
        principals: [new ServicePrincipal('logging.s3.amazonaws.com')],
        conditions: {
          ArnLike: { 'aws:SourceArn': replicationBucket.bucketArn },
          StringEquals: { 'aws:SourceAccount': stack.account },
        },
      }));
      // CDK creates this bucket during buildPipeline(); configure its L1 in
      // place so the replication bucket, policy, key and alias keep their IDs.
      const bucket = replicationBucket.node.defaultChild as CfnBucket;
      bucket.loggingConfiguration = {
        destinationBucketName: logs.bucketName,
        logFilePrefix: 'access-logs',
      };
      NagSuppressions.addResourceSuppressions(logs, [{
        id: 'AwsSolutions-S1',
        reason: 'This is the replication access-log destination; do not recursively log its own writes.',
      }]);
    }
  }
}

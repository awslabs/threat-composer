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
import { CfnOutput, RemovalPolicy } from 'aws-cdk-lib';
import {
  BehaviorOptions,
  Distribution,
  DistributionProps,
  HttpVersion,
  ViewerProtocolPolicy,
} from 'aws-cdk-lib/aws-cloudfront';
import { S3BucketOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';
import {
  BlockPublicAccess,
  Bucket,
  BucketEncryption,
  ObjectOwnership,
} from 'aws-cdk-lib/aws-s3';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';

/**
 * `DistributionProps` minus the origin, which this construct always supplies
 * itself (the private website bucket, reached through an Origin Access Control).
 */
export type StaticWebsiteDistributionProps = Omit<DistributionProps, 'defaultBehavior'> & {
  readonly defaultBehavior?: Omit<BehaviorOptions, 'origin'>;
};

export interface StaticWebsiteProps {
  /** Local directory whose contents are published to the website bucket. */
  readonly websiteContentPath: string;
  /**
   * ARN of a CLOUDFRONT-scoped WAF WebACL. Must live in us-east-1;
   * see {@link WebAclStack}.
   */
  readonly webAclArn?: string;
  /** Overrides merged into the CloudFront distribution. */
  readonly distributionProps?: StaticWebsiteDistributionProps;
}

/**
 * A private S3 bucket fronted by a CloudFront distribution, replacing
 * `@aws/pdk`'s `StaticWebsite`.
 *
 * Preserves PDK v0.26.15's Origin Access Control and website defaults.
 * Differences from the PDK construct:
 * - The WAF WebACL is a plain `CfnWebACL` in a us-east-1 stack instead of a
 *   Lambda-backed custom resource (see {@link WebAclStack}).
 * - There is no `runtime-config.json` generation; this app does not use it.
 */
export class StaticWebsite extends Construct {
  public readonly websiteBucket: Bucket;
  public readonly cloudFrontDistribution: Distribution;

  constructor(scope: Construct, id: string, props: StaticWebsiteProps) {
    super(scope, id);

    // Server access logs are delivered via a bucket policy rather than ACLs.
    this.node.setContext('@aws-cdk/aws-s3:serverAccessLogsUseBucketPolicy', true);

    const accessLogsBucket = new Bucket(this, 'AccessLogsBucket', {
      versioned: false,
      enforceSSL: true,
      autoDeleteObjects: true,
      removalPolicy: RemovalPolicy.DESTROY,
      encryption: BucketEncryption.S3_MANAGED,
      objectOwnership: ObjectOwnership.OBJECT_WRITER,
      publicReadAccess: false,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
    });

    this.websiteBucket = new Bucket(this, 'WebsiteBucket', {
      versioned: true,
      enforceSSL: true,
      autoDeleteObjects: true,
      removalPolicy: RemovalPolicy.DESTROY,
      encryption: BucketEncryption.S3_MANAGED,
      objectOwnership: ObjectOwnership.BUCKET_OWNER_ENFORCED,
      publicReadAccess: false,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      serverAccessLogsPrefix: 'website-access-logs',
      serverAccessLogsBucket: accessLogsBucket,
    });

    const distributionLogBucket = props.distributionProps?.logBucket ?? new Bucket(this, 'DistributionLogBucket', {
      enforceSSL: true,
      autoDeleteObjects: true,
      removalPolicy: RemovalPolicy.DESTROY,
      encryption: BucketEncryption.S3_MANAGED,
      objectOwnership: ObjectOwnership.BUCKET_OWNER_PREFERRED,
      publicReadAccess: false,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      serverAccessLogsPrefix: 'distribution-access-logs',
      serverAccessLogsBucket: accessLogsBucket,
    });

    const { defaultBehavior, ...distributionOverrides } = props.distributionProps ?? {};
    const defaultRootObject = props.distributionProps?.defaultRootObject ?? 'index.html';

    this.cloudFrontDistribution = new Distribution(this, 'CloudfrontDistribution', {
      httpVersion: HttpVersion.HTTP2,
      ...distributionOverrides,
      enableLogging: true,
      logBucket: distributionLogBucket,
      webAclId: distributionOverrides.webAclId ?? props.webAclArn,
      defaultRootObject,
      defaultBehavior: {
        ...defaultBehavior,
        origin: S3BucketOrigin.withOriginAccessControl(this.websiteBucket),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      // The app is a client-side-routed SPA: unknown paths must be served the
      // shell document so the router can resolve them.
      errorResponses: props.distributionProps?.errorResponses ?? [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: `/${defaultRootObject}`,
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: `/${defaultRootObject}`,
        },
      ],
    });

    new BucketDeployment(this, 'WebsiteDeployment', {
      // PDK's explicit memory size also determines the provider's logical IDs.
      memoryLimit: 2048,
      sources: [Source.asset(props.websiteContentPath)],
      destinationBucket: this.websiteBucket,
      distribution: this.cloudFrontDistribution,
    });

    new CfnOutput(this, 'DistributionDomainName', {
      value: this.cloudFrontDistribution.domainName,
    });
  }
}

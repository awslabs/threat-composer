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
import path from 'path';
import { PDKNag } from '@aws/pdk/pdk-nag';
import {
  StaticWebsite,
  StaticWebsiteOrigin,
  StaticWebsiteProps,
} from '@aws/pdk/static-website';
import {
  Stack,
  StackProps,
  CfnOutput,
  Stage,
  Duration,
  Arn,
} from 'aws-cdk-lib';
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';
import {
  DistributionProps,
  LambdaEdgeEventType,
  ResponseHeadersPolicy,
  HeadersFrameOption,
  HeadersReferrerPolicy,
} from 'aws-cdk-lib/aws-cloudfront';
import { Version } from 'aws-cdk-lib/aws-lambda';
import { HostedZone, ARecord, RecordTarget } from 'aws-cdk-lib/aws-route53';
import { CloudFrontTarget } from 'aws-cdk-lib/aws-route53-targets';
import {
  AwsSdkCall,
  PhysicalResourceId,
  AwsCustomResource,
  AwsCustomResourcePolicy,
} from 'aws-cdk-lib/custom-resources';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';
import { STAGE_PREFIX_IDE_EXTENSION_ENV } from './constants';

const PACKAGES_ROOT = path.join(__dirname, '..', '..');

const removeLeadingSlash = (value: string): string => {
  return value.slice(0, 1) == '/' ? value.slice(1) : value;
};

export class ApplicationStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const stageName = Stage.of(this)?.stageName || 'Dev';

    let assetPath = path.join(
      PACKAGES_ROOT,
      'threat-composer-app',
      'build',
      'website',
    );

    if (stageName?.startsWith(STAGE_PREFIX_IDE_EXTENSION_ENV)) {
      assetPath = path.join(
        PACKAGES_ROOT,
        'threat-composer-app',
        'build',
        'ide-extension',
      );
    }

    const domainName = this.node.tryGetContext(`domainName${stageName}`);
    const certificate = this.node.tryGetContext(`certificate${stageName}`);
    const hostedZoneId = this.node.tryGetContext(
      `hostZone${stageName}`,
    ) as string;
    const hostedZoneName = this.node.tryGetContext(
      `hostZoneName${stageName}`,
    ) as string;
    const lambdaEdge = this.node.tryGetContext(
      `lambdaEdge${stageName}`,
    ) as string;
    const cidrType = this.node.tryGetContext(`cidrType${stageName}`) as string;
    const cidrRanges = this.node.tryGetContext(
      `cidrRanges${stageName}`,
    ) as string;

    const contentSecurityPolicyOverride = this.node.tryGetContext(
      'contentSecurityPolicyOverride',
    ) as string;

    const cacheControlNoCache = (this.node.tryGetContext('cacheControlNoCache') as string) !== 'false';

    const responseHeadersPolicy = new ResponseHeadersPolicy(
      this,
      'ResourceHeadersPolicy',
      {
        responseHeadersPolicyName: `ThreatComposerResourceHeadersPolicy${stageName}`,
        corsBehavior: {
          accessControlAllowCredentials: false,
          accessControlAllowMethods: ['ALL'],
          accessControlAllowOrigins: ['*'],
          accessControlAllowHeaders: ['*'],
          originOverride: true,
        },
        customHeadersBehavior: cacheControlNoCache ? {
          customHeaders: [
            { header: 'pragma', value: 'no-cache', override: true },
            {
              header: 'cache-control',
              value: 'no-store, no-cache',
              override: true,
            },
          ],
        } : undefined,
        securityHeadersBehavior: {
          // A default content security policy is present in the index.html file to cater for github page hosting.
          // Here allow users to override to cater for specific use cases.
          contentSecurityPolicy: contentSecurityPolicyOverride
            ? {
              contentSecurityPolicy: contentSecurityPolicyOverride,
              override: true,
            }
            : undefined,
          frameOptions: {
            frameOption: HeadersFrameOption.DENY,
            override: true,
          },
          referrerPolicy: {
            referrerPolicy: HeadersReferrerPolicy.NO_REFERRER,
            override: true,
          },
          strictTransportSecurity: {
            accessControlMaxAge: Duration.seconds(63072000),
            includeSubdomains: true,
            preload: true,
            override: true,
          },
          contentTypeOptions: { override: true },
        },
      },
    );

    let distributionProps: DistributionProps = {
      defaultBehavior: {
        origin: new StaticWebsiteOrigin(),
        responseHeadersPolicy: responseHeadersPolicy,
      },
    };

    if (domainName && certificate) {
      distributionProps = {
        ...distributionProps,
        domainNames: [domainName],
        certificate: Certificate.fromCertificateArn(
          this,
          'cloudfrontDistributionFromCertificateArn',
          certificate,
        ),
      };
    }

    if (lambdaEdge) {
      let lambdaEdgeArn = lambdaEdge;

      if (!lambdaEdgeArn.includes(':lambda:')) {
        const lambdaEdgeRegion = 'us-east-1';

        // The provided value is expected to be SSM Parameter in us-east-1 (where the lambda edge is deployed)
        const ssmAwsSdkCall: AwsSdkCall = {
          service: 'SSM',
          action: 'getParameter',
          parameters: {
            Name: lambdaEdge,
          },
          region: lambdaEdgeRegion,
          physicalResourceId: PhysicalResourceId.of(Date.now().toString()),
        };

        const ssmAwsSdkCallCustomResource = new AwsCustomResource(
          this,
          'SSMAWSSDKCallCustomResource',
          {
            onCreate: ssmAwsSdkCall,
            onUpdate: ssmAwsSdkCall,
            policy: AwsCustomResourcePolicy.fromSdkCalls({
              resources: [
                Arn.format(
                  {
                    service: 'ssm',
                    region: lambdaEdgeRegion,
                    resource: 'parameter',
                    resourceName: removeLeadingSlash(lambdaEdge),
                  },
                  Stack.of(this),
                ),
              ],
            }),
          },
        );

        lambdaEdgeArn = ssmAwsSdkCallCustomResource
          .getResponseField('Parameter.Value')
          .toString();
      }

      distributionProps = {
        ...distributionProps,
        defaultBehavior: {
          ...distributionProps.defaultBehavior,
          edgeLambdas: [
            {
              functionVersion: Version.fromVersionArn(
                this,
                'LambdaEdgeFunctionVersion',
                lambdaEdgeArn,
              ),
              eventType: LambdaEdgeEventType.VIEWER_REQUEST,
            },
          ],
        },
      };
    }

    const websiteProps: StaticWebsiteProps = {
      websiteContentPath: assetPath,
      webAclProps: {
        cidrAllowList: {
          cidrType: cidrType === 'IPV6' ? 'IPV6' : 'IPV4',
          cidrRanges: cidrRanges
            ?.split(',')
            .map((x) => x.trim())
            .filter((x) => !!x) || ['192.168.0.0/24'],
        },
      },
      distributionProps,
    };

    const website = new StaticWebsite(this, 'StaticWebsite', websiteProps);

    if (hostedZoneId && hostedZoneName) {
      const hostZone = HostedZone.fromHostedZoneAttributes(
        this,
        'HostZoneLookup',
        {
          hostedZoneId,
          zoneName: hostedZoneName,
        },
      );
      new ARecord(this, 'Route53Record', {
        zone: hostZone,
        recordName: domainName,
        target: RecordTarget.fromAlias(
          new CloudFrontTarget(website.cloudFrontDistribution),
        ),
      });
    }

    this.suppressCDKNagViolations(websiteProps, website);

    new CfnOutput(this, 'WebsiteCloudfrontDomainName', {
      value: website.cloudFrontDistribution.domainName,
    });
  }

  private suppressCDKNagViolations = (props: StaticWebsiteProps, website: StaticWebsite) => {
    const stack = Stack.of(this);
    !props.distributionProps?.certificate &&
      [
        'AwsSolutions-CFR4',
        'AwsPrototyping-CloudFrontDistributionHttpsViewerNoOutdatedSSL',
      ].forEach((RuleId) => {
        NagSuppressions.addResourceSuppressions(website.cloudFrontDistribution, [
          {
            id: RuleId,
            reason:
              'Certificate is not mandatory therefore the Cloudfront certificate will be used.',
          },
        ]);
      });

    ['AwsSolutions-L1', 'AwsPrototyping-LambdaLatestVersion'].forEach(
      (RuleId) => {
        NagSuppressions.addResourceSuppressions(
          this,
          [
            {
              id: RuleId,
              reason:
                'Latest runtime cannot be configured. CDK will need to upgrade the BucketDeployment construct accordingly.',
            },
          ],
          true,
        );
      },
    );

    ['AwsSolutions-IAM5', 'AwsPrototyping-IAMNoWildcardPermissions'].forEach(
      (RuleId) => {
        NagSuppressions.addResourceSuppressions(
          this,
          [
            {
              id: RuleId,
              reason:
                'All Policies have been scoped to a Bucket. Given Buckets can contain arbitrary content, wildcard resources with bucket scope are required.',
              appliesTo: [
                {
                  regex: '/^Action::s3:.*$/g',
                },
                {
                  regex: '/^Resource::.*$/g',
                },
              ],
            },
          ],
          true,
        );
      },
    );

    ['AwsSolutions-IAM4', 'AwsPrototyping-IAMNoManagedPolicies'].forEach(
      (RuleId) => {
        NagSuppressions.addResourceSuppressions(
          this,
          [
            {
              id: RuleId,
              reason:
                'Buckets can contain arbitrary content, therefore wildcard resources under a bucket are required.',
              appliesTo: [
                {
                  regex: `/^Policy::arn:${PDKNag.getStackPartitionRegex(
                    stack,
                  )}:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole$/g`,
                },
              ],
            },
          ],
          true,
        );
      },
    );

    ['AwsSolutions-S1', 'AwsPrototyping-S3BucketLoggingEnabled'].forEach(
      (RuleId) => {
        NagSuppressions.addResourceSuppressions(
          this,
          [
            {
              id: RuleId,
              reason: 'Access Log buckets should not have s3 bucket logging',
            },
          ],
          true,
        );
      },
    );
  };
}

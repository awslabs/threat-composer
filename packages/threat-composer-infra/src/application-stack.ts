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
import path from "path";
import { PDKNag } from "@aws-prototyping-sdk/pdk-nag";
import {
  StaticWebsite,
  StaticWebsiteOrigin,
  StaticWebsiteProps,
} from "@aws-prototyping-sdk/static-website";
import { Stack, StackProps, CfnOutput, Stage } from "aws-cdk-lib";
import { Certificate } from "aws-cdk-lib/aws-certificatemanager";
import {
  DistributionProps,
  LambdaEdgeEventType,
} from "aws-cdk-lib/aws-cloudfront";
import { Version } from "aws-cdk-lib/aws-lambda";
import { HostedZone, ARecord, RecordTarget } from "aws-cdk-lib/aws-route53";
import { CloudFrontTarget } from "aws-cdk-lib/aws-route53-targets";
import { NagSuppressions } from "cdk-nag";
import { Construct } from "constructs";

const PACKAGES_ROOT = path.join(__dirname, "..", "..");

export class ApplicationStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const domainName = this.node.tryGetContext(
      `domainName${Stage.of(this)?.stageName}`
    );
    const certificate = this.node.tryGetContext(
      `certificate${Stage.of(this)?.stageName}`
    );
    const hostedZoneId = this.node.tryGetContext(
      `hostZone${Stage.of(this)?.stageName}`
    ) as string;
    const hostedZoneName = this.node.tryGetContext(
      `hostZoneName${Stage.of(this)?.stageName}`
    ) as string;
    const lambdaEdge = this.node.tryGetContext(
      `lambdaEdge${Stage.of(this)?.stageName}`
    ) as string;

    let distributionProps: DistributionProps = {
      defaultBehavior: {
        origin: new StaticWebsiteOrigin(),
      },
    };

    if (domainName && certificate) {
      distributionProps = {
        ...distributionProps,
        domainNames: [domainName],
        certificate: Certificate.fromCertificateArn(
          this,
          "cloudfrontDistributionFromCertificateArn",
          certificate
        ),
      };
    }

    if (lambdaEdge) {
      distributionProps = {
        ...distributionProps,
        defaultBehavior: {
          ...distributionProps.defaultBehavior,
          edgeLambdas: [
            {
              functionVersion: Version.fromVersionArn(
                this,
                "LambdaEdgeFunctionVersion",
                lambdaEdge
              ),
              eventType: LambdaEdgeEventType.VIEWER_REQUEST,
            },
          ],
        },
      };
    }

    const websiteProps = {
      websiteContentPath: path.join(
        PACKAGES_ROOT,
        "threat-composer-app",
        "build"
      ),
      distributionProps:
        (domainName && certificate) || lambdaEdge
          ? distributionProps
          : undefined,
    };

    const website = new StaticWebsite(this, "StaticWebsite", websiteProps);

    if (hostedZoneId && hostedZoneName) {
      const hostZone = HostedZone.fromHostedZoneAttributes(
        this,
        "HostZoneLookup",
        {
          hostedZoneId,
          zoneName: hostedZoneName,
        }
      );
      new ARecord(this, "Route53Record", {
        zone: hostZone,
        recordName: domainName,
        target: RecordTarget.fromAlias(
          new CloudFrontTarget(website.cloudFrontDistribution)
        ),
      });
    }

    this.suppressCDKNagViolations(websiteProps, website);

    new CfnOutput(this, "WebsiteCloudfrontDomainName", {
      value: website.cloudFrontDistribution.domainName,
    });
  }

  private suppressCDKNagViolations = (
    props: StaticWebsiteProps,
    website: StaticWebsite
  ) => {
    const stack = Stack.of(this);
    !props.distributionProps?.certificate &&
      [
        "AwsSolutions-CFR4",
        "AwsPrototyping-CloudFrontDistributionHttpsViewerNoOutdatedSSL",
      ].forEach((RuleId) => {
        NagSuppressions.addResourceSuppressions(
          website.cloudFrontDistribution,
          [
            {
              id: RuleId,
              reason:
                "Certificate is not mandatory therefore the Cloudfront certificate will be used.",
            },
          ]
        );
      });

    ["AwsSolutions-L1", "AwsPrototyping-LambdaLatestVersion"].forEach(
      (RuleId) => {
        NagSuppressions.addResourceSuppressions(
          this,
          [
            {
              id: RuleId,
              reason:
                "Latest runtime cannot be configured. CDK will need to upgrade the BucketDeployment construct accordingly.",
            },
          ],
          true
        );
      }
    );

    ["AwsSolutions-IAM5", "AwsPrototyping-IAMNoWildcardPermissions"].forEach(
      (RuleId) => {
        NagSuppressions.addResourceSuppressions(
          this,
          [
            {
              id: RuleId,
              reason:
                "All Policies have been scoped to a Bucket. Given Buckets can contain arbitrary content, wildcard resources with bucket scope are required.",
              appliesTo: [
                {
                  regex: "/^Action::s3:.*$/g",
                },
                {
                  regex: `/^Resource::.*$/g`,
                },
              ],
            },
          ],
          true
        );
      }
    );

    ["AwsSolutions-IAM4", "AwsPrototyping-IAMNoManagedPolicies"].forEach(
      (RuleId) => {
        NagSuppressions.addResourceSuppressions(
          this,
          [
            {
              id: RuleId,
              reason:
                "Buckets can contain arbitrary content, therefore wildcard resources under a bucket are required.",
              appliesTo: [
                {
                  regex: `/^Policy::arn:${PDKNag.getStackPartitionRegex(
                    stack
                  )}:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole$/g`,
                },
              ],
            },
          ],
          true
        );
      }
    );

    ["AwsSolutions-S1", "AwsPrototyping-S3BucketLoggingEnabled"].forEach(
      (RuleId) => {
        NagSuppressions.addResourceSuppressions(
          this,
          [
            {
              id: RuleId,
              reason: "Access Log buckets should not have s3 bucket logging",
            },
          ],
          true
        );
      }
    );
  };
}

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
import {
  StaticWebsite,
  StaticWebsiteOrigin,
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

    const website = new StaticWebsite(this, "StaticWebsite", {
      websiteContentPath: path.join(
        PACKAGES_ROOT,
        "threat-statement-generator-demo-app",
        "build"
      ),
      distributionProps:
        (domainName && certificate) || lambdaEdge
          ? distributionProps
          : undefined,
    });

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

    new CfnOutput(this, "WebsiteCloudfrontDomainName", {
      value: website.cloudFrontDistribution.domainName,
    });
  }
}

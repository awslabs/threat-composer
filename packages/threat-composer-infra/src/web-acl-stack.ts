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
import type { StackProps } from 'aws-cdk-lib';
import { CfnOutput, Stack } from 'aws-cdk-lib';
import { CfnIPSet, CfnWebACL } from 'aws-cdk-lib/aws-wafv2';
import type { Construct } from 'constructs';

/** CloudFront-scoped WAF resources can only exist in us-east-1. */
export const WEB_ACL_REGION = 'us-east-1';

export type CidrType = 'IPV4' | 'IPV6';

export interface WebAclStackProps extends StackProps {
  /** `IPV4` or `IPV6`; must match the format of {@link cidrRanges}. */
  readonly cidrType: CidrType;
  /** CIDR ranges permitted to reach the distribution. */
  readonly cidrRanges: string[];
}

/**
 * A CLOUDFRONT-scoped WAF WebACL that blocks every request originating outside
 * an IP allow list.
 *
 * This replaces `@aws/pdk`'s `CloudfrontWebAcl`, which reached us-east-1 from
 * any region using a Lambda-backed custom resource that called the wafv2 API
 * directly. Here the resources are ordinary CloudFormation, which means the
 * stack itself must be pinned to us-east-1 and its ARN handed to the
 * distribution through a cross-region reference.
 */
export class WebAclStack extends Stack {
  public readonly webAclArn: string;

  constructor(scope: Construct, id: string, props: WebAclStackProps) {
    super(scope, id, {
      ...props,
      env: {
        ...props.env,
        region: WEB_ACL_REGION,
      },
      // Lets the application stack in another region consume webAclArn.
      crossRegionReferences: true,
    });

    const ipSet = new CfnIPSet(this, 'AllowListIpSet', {
      scope: 'CLOUDFRONT',
      ipAddressVersion: props.cidrType,
      addresses: props.cidrRanges,
      description: 'CIDR ranges allowed to reach the Threat Composer distribution',
    });

    const webAcl = new CfnWebACL(this, 'WebAcl', {
      scope: 'CLOUDFRONT',
      defaultAction: { allow: {} },
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        sampledRequestsEnabled: true,
        metricName: `${this.stackName}-WebAcl`,
      },
      rules: [
        {
          name: `${this.stackName}-CidrAllowList`,
          priority: 1,
          action: { block: {} },
          statement: {
            notStatement: {
              statement: {
                ipSetReferenceStatement: { arn: ipSet.attrArn },
              },
            },
          },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            sampledRequestsEnabled: true,
            metricName: `${this.stackName}-CidrAllowList`,
          },
        },
      ],
    });

    this.webAclArn = webAcl.attrArn;

    new CfnOutput(this, 'WebAclArn', { value: this.webAclArn });
  }
}

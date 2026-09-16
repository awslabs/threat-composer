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
import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { WebAclStack } from '../src/web-acl-stack';

test.each([
  { cidrType: 'IPV4' as const, cidrRanges: ['192.0.2.0/24'] },
  { cidrType: 'IPV6' as const, cidrRanges: ['2001:db8::/32'] },
  { cidrType: 'IPV4' as const, cidrRanges: [] },
])('enforces managed rules and the $cidrType allow list ($cidrRanges)', (cidr) => {
  const stack = new WebAclStack(new App(), 'waf-test', {
    ...cidr, env: { account: '111111111111', region: 'us-west-2' },
  });
  expect(stack.region).toBe('us-east-1');
  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::WAFv2::IPSet', {
    Scope: 'CLOUDFRONT', IPAddressVersion: cidr.cidrType, Addresses: cidr.cidrRanges,
  });
  const acl = template.toJSON().Resources.WebAcl.Properties;
  expect(acl.Scope).toBe('CLOUDFRONT');
  expect(acl.DefaultAction).toEqual({ Allow: {} });
  expect(acl.Rules).toEqual([
    {
      Name: 'AWS-AWSManagedRulesCommonRuleSet',
      Priority: 0,
      OverrideAction: { None: {} },
      Statement: { ManagedRuleGroupStatement: { VendorName: 'AWS', Name: 'AWSManagedRulesCommonRuleSet' } },
      VisibilityConfig: {
        CloudWatchMetricsEnabled: true, SampledRequestsEnabled: true, MetricName: 'AWS-AWSManagedRulesCommonRuleSet',
      },
    },
    {
      Name: 'waf-test-CidrAllowList',
      Priority: 1,
      Action: { Block: {} },
      Statement: { NotStatement: { Statement: { IPSetReferenceStatement: { Arn: { 'Fn::GetAtt': ['AllowListIpSet', 'Arn'] } } } } },
      VisibilityConfig: {
        CloudWatchMetricsEnabled: true, SampledRequestsEnabled: true, MetricName: 'waf-test-CidrAllowList',
      },
    },
  ]);
});

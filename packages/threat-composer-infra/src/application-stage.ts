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
import type { StageProps } from 'aws-cdk-lib';
import { Stage } from 'aws-cdk-lib';
import type { Construct } from 'constructs';
import { ApplicationStack } from './application-stack';
import type { CidrType } from './web-acl-stack';
import { WebAclStack } from './web-acl-stack';

export class ApplicationStage extends Stage {
  constructor(scope: Construct, id: string, props?: StageProps) {
    super(scope, id, props);

    const cidrType = this.node.tryGetContext(`cidrType${this.stageName}`) as string;
    const cidrRanges = this.node.tryGetContext(`cidrRanges${this.stageName}`) as string;

    // The WAF WebACL has to be a separate stack because CloudFront-scoped WAF
    // resources only exist in us-east-1, while the application stack follows
    // the stage's region.
    const webAclStack = new WebAclStack(this, 'ThreatComposerWebAclStack', {
      env: props?.env,
      cidrType: cidrType === 'IPV6' ? 'IPV6' : ('IPV4' as CidrType),
      cidrRanges: cidrRanges
        ?.split(',')
        .map((x) => x.trim())
        .filter((x) => !!x) || ['192.168.0.0/24'],
      terminationProtection: this.stageName.endsWith('Prod'),
    });

    const applicationStack = new ApplicationStack(this, 'ThreatComposerAppStack', {
      env: props?.env,
      terminationProtection: this.stageName.endsWith('Prod'),
      webAclArn: webAclStack.webAclArn,
      crossRegionReferences: true,
    });

    applicationStack.addStackDependency(webAclStack);
  }
}

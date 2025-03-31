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
import { TemplateThreatStatement } from '@aws/threat-composer-core';
import parseThreatStatement from '.';

describe('parseThreatStatement', () => {
  test('parses threat statement element with template and generates output', () => {
    const statement: TemplateThreatStatement = {
      id: 'newId',
      numericId: -1,
      threatSource: 'internal actor',
      prerequisites: 'with authorized access to the AWS accounts',
      threatAction: 'modify the configuration of the AWS services and/or resources within the trust boundary',
      threatImpact: 'a loss of trust in the services to behave as configured',
      impactedGoal: [],
      impactedAssets: [
        'assets within the trust boundary',
      ],
    };
    const template = 'A [threat_source] [prerequisites] can [threat_action], which leads to [threat_impact] of [impacted_assets]';

    const outputProcessor = jest.fn().mockImplementation((_token, content, before, _filled) => [
      before,
      content,
    ]);

    const output = parseThreatStatement({
      template,
      statement,
      outputProcessor,
    });

    expect(output).toEqual([
      'An ',
      'internal actor',
      ' ',
      'with authorized access to the AWS accounts',
      ' can ',
      'modify the configuration of the AWS services and/or resources within the trust boundary',
      ', which leads to ',
      'a loss of trust in the services to behave as configured',
      ' of ',
      'assets within the trust boundary',
    ],
    );
  });
});
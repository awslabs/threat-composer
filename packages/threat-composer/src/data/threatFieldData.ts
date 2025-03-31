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
import { ThreatFieldData } from '@aws/threat-composer-core';

const threatFieldData: {
  [fieldName: string]: ThreatFieldData;
} = {
  threat_source: {
    fieldId: 1,
    fieldPosition: 1,
    weight: 10,
    displayTitle: 'Threat source',
    displayField: 'threat source',
    tooltip: 'threat source',
    description: 'Consider who or what is the source of the threat.',
  },
  prerequisites: {
    fieldId: 2,
    fieldPosition: 2,
    weight: 10,
    displayTitle: 'Prerequisites',
    displayField: 'prerequisites',
    tooltip: 'prerequisites',
    description: 'Consider what conditions or requirement that must be met in order for a threat sources (e.g. threat actor) actions to be viable.',
  },
  threat_action: {
    fieldId: 4,
    fieldPosition: 3,
    weight: 30,
    displayTitle: 'Threat action',
    displayField: 'threat action',
    tooltip: 'threat action',
    description: 'What actions are being performed by, or related to the threat source?',
  },
  threat_impact: {
    fieldId: 8,
    fieldPosition: 4,
    weight: 10,
    displayTitle: 'Threat impact',
    displayField: 'threat impact',
    tooltip: 'threat impact',
    description: 'What are the direct/initial impacts of the threat actions if they were to be successful?',
  },
  impacted_goal: {
    fieldId: 16,
    fieldPosition: 5,
    weight: 20,
    displayTitle: 'Impacted goal',
    displayField: 'impacted goal',
    tooltip: 'impacted goal',
    description: 'Which desirable goal for the organisation assets is impacted negatively as a result?',
    tokens: ['confidentiality', 'integrity', 'availability'],
  },
  impacted_assets: {
    fieldId: 32,
    fieldPosition: 6,
    weight: 20,
    displayTitle: 'Impacted assets',
    displayField: 'impacted assets',
    tooltip: 'impacted assets',
    description: 'Which assets are in scope for negative impact as a result?',
    tokens: [],
  },
};

export default threatFieldData;
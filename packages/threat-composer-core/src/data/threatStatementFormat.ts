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
import { ThreatStatementFormat } from '../schemas/threats';

const threatStatementFormat: ThreatStatementFormat = {
  7: {
    template: 'A [threat_source] [prerequisites] can [threat_action]',
    suggestions: [
      '[threat_impact] Consider if there is any initial impact of the threat as a result of the threat action being successful',
      '[impacted_goal] Consider which specific desirable goal (e.g. confidentially) is being diminished against the listed assests. It is important to understand the impact of the risk, and to help with prioritisation',
      '[impacted_assets] Consider which assets are being impacted. It is important to understand the impact of the risk, and to help with prioritisation',
    ],
  },
  15: {
    template: 'A [threat_source] [prerequisites] can [threat_action], which leads to [threat_impact]',
    suggestions: [
      '[impacted_assets] Consider which assets could be negatively impacted. It is important to understand the impact of the risk, and to help with prioritisation',
      '[impacted_goal] Consider which specific desirable goal (e.g. confidentially) is being diminished. It is important to understand the impact of the risk, and to help with prioritisation',
    ],
  },
  23: {
    template: 'A [threat_source] [prerequisites] can [threat_action], resulting in reduced [impacted_goal]',
    suggestions: [
      '[threat_impact] Consider if there is any initial impact of the threat leading up to the dimineshing of the desirable goal',
      '[impacted_assets] Consider which assets are being impacted. It is important to understand the impact of the risk, and to help with prioritisation',
    ],
  },
  31: {
    template: 'A [threat_source] [prerequisites] can [threat_action], which leads to [threat_impact], resulting in reduced [impacted_goal]',
    suggestions: [
      '[impacted_assets] Consider which assets are being impacted. It is important to understand the impact of the risk, and to help with prioritisation',
    ],
  },
  39: {
    template: 'A [threat_source] [prerequisites] can [threat_action], negatively impacting [impacted_assets]',
    suggestions: [
      '[threat_impact] Consider if there is any initial impact of the threat as a result of the threat action being successful',
      '[impacted_goal] Consider which specific desirable goal (e.g. confidentially) is being diminished against the listed assests. It is important to understand the impact of the risk, and to help with prioritisation',
    ],
  },
  47: {
    template: 'A [threat_source] [prerequisites] can [threat_action], which leads to [threat_impact], negatively impacting [impacted_assets]',
    suggestions: [
      '[impacted_goal] Consider which specific desirable goal (e.g. confidentially) is being diminished. It is important to understand the impact of the risk, and to help with prioritisation',
    ],
  },
  55: {
    template: 'A [threat_source] [prerequisites] can [threat_action], resulting in reduced [impacted_goal] of [impacted_assets]',
    suggestions: [
      '[threat_impact] Consider if there is any initial impact of the threat leading up to the desirable goal being diminished in specified assets',
    ],
  },
  63: {
    template: 'A [threat_source] [prerequisites] can [threat_action], which leads to [threat_impact], resulting in reduced [impacted_goal] of [impacted_assets]',
    suggestions: [],
  },
};

export default threatStatementFormat;
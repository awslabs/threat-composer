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
import { z } from 'zod';
import { EntityBaseSchema, StatusSchema, MetadataSchemaThreats } from './entities';
import { SINGLE_FIELD_INPUT_MAX_LENGTH, LEVEL_HIGH, LEVEL_MEDIUM, LEVEL_LOW, LEVEL_NOT_SET, STATUS_NOT_SET, THREAT_STATUS_IDENTIFIED, THREAT_STATUS_NOT_USEFUL, THREAT_STATUS_RESOLVED } from '../configs';
import threatStatus from '../data/status/threatStatus.json';

export const ThreatStatementDisplayTokenSchema = z.object({
  /**
   * the html tag type for the content. If not type is specified. <span> will be used.
   */
  type: z.union([z.literal('b'), z.literal('span')]).optional().describe('HTML element type for rendering'),
  /**
    * The tooltip content of the node.
    */
  tooltip: z.string().max(30).optional().describe('Threat statement element to anchor tool tip'),
  /**
    * The text content of the node.
    */
  content: z.string().max(SINGLE_FIELD_INPUT_MAX_LENGTH).describe('Displayed tooltip text'),
}).strict();

export type ThreatStatementDisplayToken = z.infer<typeof ThreatStatementDisplayTokenSchema>;

export const ThreatStatementImpactedGoalItem = z.string().max(SINGLE_FIELD_INPUT_MAX_LENGTH);

export const ThreatStatementImpactedAssetItem = z.string().max(SINGLE_FIELD_INPUT_MAX_LENGTH);

export const TemplateThreatStatementSchema = EntityBaseSchema.extend({
  /**
    * Source of the threat.
    */
  threatSource: z.string().max(SINGLE_FIELD_INPUT_MAX_LENGTH).optional().describe('The entity taking action. For example: An actor (a useful default), An internet-based actor, An internal or external actor.'),
  /**
    * Prerequisites of the threat.
    */
  prerequisites: z.string().max(SINGLE_FIELD_INPUT_MAX_LENGTH).optional().describe('Conditions or requirements that must be met for a threat source\'s action to be viable. For example: -with access to another user\'s token. -who has administrator access -with user permissions - in a mitm position -with a network path to the API. If no prerequistes known return empty string, if know return but first word must be lower case'),
  /**
    * Threat action.
    */
  threatAction: z.string().max(SINGLE_FIELD_INPUT_MAX_LENGTH).optional().describe('The action being performed by the threat source. For example: -spoof another user -tamper with data stored in the database -make thousands of concurrent requests. first word must be lower case'),
  /**
    * Impact of the threat.
    */
  threatImpact: z.string().max(SINGLE_FIELD_INPUT_MAX_LENGTH).optional().describe('What impact this has on the system.The direct impact of a successful threat action. For example: - unauthorized access to the user\'s bank account information -modifying the username for the all-time high score. -a web application being unable to handle other user requests.if know return but first word must be lower case'),
  /**
    * Impacted goal of the threat.
    */
  impactedGoal: ThreatStatementImpactedGoalItem.array().optional().describe('The information security or business objective that is negatively affected.  This is most commonly the CIA triad: -confidentiality, -integrity, -availability. If not known return empty string in array, else strings in array first word must be lower case'),
  /**
    * Impacted assets of the threat.
    */
  impactedAssets: ThreatStatementImpactedAssetItem.array().optional().describe('List of assets affected by this threat. If not known return empty string in array, else strings in array first word must be lower case'),
  /**
    * The full rendered statement as string.
    */
  statement: z.string().max(SINGLE_FIELD_INPUT_MAX_LENGTH * 7).optional().describe('concatenate the above as follows into a one of the following permutations based on if the default is available or not - trim any repated white space into a single white space: 1/ A/an [threat_source] [prerequisites] can [threat_action], 2/ A/an [threat_source] [prerequisites] can [threat_action], which leads to [threat_impact], 3/ A/an [threat_source] [prerequisites] can [threat_action], resulting in reduced [impacted_goal], 4/ A/An [threat_source] [prerequisites] can [threat_action], which leads to [threat_impact], resulting in reduced [impacted_goal], 5/ A/An [threat_source] [prerequisites] can [threat_action], negatively impacting [impacted_assets], 6/ A/An [threat_source] [prerequisites] can [threat_action], which leads to [threat_impact], negatively impacting [impacted_assets], 7/ A/An [threat_source] [prerequisites] can [threat_action], resulting in reduced [impacted_goal] of [impacted_assets], 8/ A/An [threat_source] [prerequisites] can [threat_action], which leads to [threat_impact], resulting in reduced [impacted_goal] of [impacted_assets]'),
  /**
    * The custom templates applied to the threat statement.
    */
  customTemplate: z.string().max(SINGLE_FIELD_INPUT_MAX_LENGTH).optional().describe('Custom template used for threat statement generation. Example: A [threatSource] [prerequisites] can [threatAction]'),
  /**
    * A list of displayed statement token
    */
  displayedStatement: z.union([ThreatStatementDisplayTokenSchema, z.string()]).array().optional().meta({ internal: true }).describe('Parsed threat statement components for display rendering. This uses use of supporting HTML tags'),
  /**
   * The metadata - overridden to support full metadata schema for threats.
   */
  metadata: MetadataSchemaThreats.array().optional().describe('Additional metadata as key-value pairs for threats'),
  /**
   * The status of the threats.
   */
  status: StatusSchema.pipe(z.enum(threatStatus.map(x => x.value) as [string, ...string[]])).optional().describe('Status of the threat'),
}).strict();

export type TemplateThreatStatement = z.infer<typeof TemplateThreatStatementSchema>;

export interface ThreatFieldData {
  fieldId: number;
  fieldPosition: number;
  weight: number;
  displayTitle: string;
  displayField: string;
  tooltip: string;
  description: string;
  examples?: string[];
  tokens?: string[];
}
export interface ThreatStatementListFilter {
  linkedMitigations?: boolean;
  linkedAssumptions?: boolean;
  priority?: typeof LEVEL_HIGH | typeof LEVEL_MEDIUM | typeof LEVEL_LOW | typeof LEVEL_NOT_SET;
  stride?: 'S' | 'T' | 'R' | 'I' | 'D' | 'E' | typeof LEVEL_NOT_SET;
  status?: (typeof THREAT_STATUS_IDENTIFIED | typeof THREAT_STATUS_NOT_USEFUL | typeof THREAT_STATUS_RESOLVED | typeof STATUS_NOT_SET)[];
}

export interface ThreatStatementFormat {
  [fieldCombination: number]: {
    template: string;
    suggestions?: string[];
  };
}

export const PerFieldExampleSchema = z.object({
  /**Example string */
  example: z.string(),
  /**
  * The statement Id.
  * For now, use the array index.
  * In future, if the examples are downloaded online, should change to use threatStatementId.
  */
  fromId: z.number(),
  /**
    * The stride from the statement.
    */
  stride: z.string().array().optional(),
});

export type PerFieldExample = z.infer<typeof PerFieldExampleSchema>;

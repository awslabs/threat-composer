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
import { EntityBaseSchema } from './entities';
import { SINGLE_FIELD_INPUT_MAX_LENGTH } from '../configs';

export const ThreatStatementDisplayTokenSchema = z.object({
  /**
   * the html tag type for the content. If not type is specified. <span> will be used.
   */
  type: z.string().optional(),
  /**
   * the props of the html node.
   */
  props: z.any().optional(),
  /**
    * The tooltip content of the node.
    */
  tooltip: z.string().optional(),
  /**
    * The text content of the node.
    */
  content: z.string(),
});

export type ThreatStatementDisplayToken = z.infer<typeof ThreatStatementDisplayTokenSchema>;


export const TemplateThreatStatementSchema = EntityBaseSchema.extend({
  /**
    * Source of the threat.
    */
  threatSource: z.string().max(SINGLE_FIELD_INPUT_MAX_LENGTH).optional(),
  /**
    * Prerequisites of the threat.
    */
  prerequisites: z.string().max(SINGLE_FIELD_INPUT_MAX_LENGTH).optional(),
  /**
    * Threat action.
    */
  threatAction: z.string().max(SINGLE_FIELD_INPUT_MAX_LENGTH).optional(),
  /**
    * Impact of the threat.
    */
  threatImpact: z.string().max(SINGLE_FIELD_INPUT_MAX_LENGTH).optional(),
  /**
    * Impacted goal of the threat.
    */
  impactedGoal: z.string().max(SINGLE_FIELD_INPUT_MAX_LENGTH).array().optional(),
  /**
    * Impacted assets of the threat.
    */
  impactedAssets: z.string().max(SINGLE_FIELD_INPUT_MAX_LENGTH).array().optional(),
  /**
    * The full rendered statement as string;
    */
  statement: z.string().optional(),
  /**
    * The custom templates applied to the threat statement.
    */
  customTemplate: z.string().max(SINGLE_FIELD_INPUT_MAX_LENGTH).optional(),
  /**
    * A list of displayed statement token
    */
  displayedStatement: z.union([ThreatStatementDisplayTokenSchema, z.string()]).array().optional(),
});

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
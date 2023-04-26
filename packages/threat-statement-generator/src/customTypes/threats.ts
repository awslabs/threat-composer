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
import { AssumptionLink } from './assumptions';
import { EntityBase } from './entities';
import { MitigationLink } from './mitigations';

export interface TemplateThreatStatement extends EntityBase {
  /**
     * Source of the threat.
     */
  threatSource?: string;
  /**
     * Prerequisites of the threat.
     */
  prerequisites?: string;
  /**
     * Threat action.
     */
  threatAction?: string;
  /**
     * Impact of the threat.
     */
  threatImpact?: string;
  /**
     * Impacted goal of the threat.
     */
  impactedGoal?: string[];
  /**
     * Impacted assets of the threat.
     */
  impactedAssets?: string[];
  /**
     * The full rendered statement as string;
     */
  statement?: string;
  /**
     * A list of
     */
  displayedStatement?: ThreatStatementDisplayToken[];
  /**
     * The custom templates applied to the threat statement.
     */
  customTemplate?: string;
  /**
     * A list of mitigations linked to the threat.
     */
  mitigationList?: MitigationLink[];
  /**
     * A list of assumptions linked to the threat.
     */
  assumptionList?: AssumptionLink[];
}

export interface ThreatStatementDisplayToken {
  /**
       * the html tag type for the content. If not type is specified. <span> will be used.
       */
  type?: string;
  /**
       * the props of the html node.
       */
  props?: any;
  /**
       * The tooltip content of the node.
       */
  tooltip?: string;
  /**
       * The text content of the node.
       */
  content: string;
};

export type ThreatStatementList = TemplateThreatStatement[];

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

export interface PerFieldExample {
  example: string;
  /**
     * The statement Id.
     * For now, use the array index.
     * In future, if the examples are downloaded online, should change to use threatStatementId.
     */
  fromId: number;
  /**
     * The stride from the statement.
     */
  stride?: string[];
}

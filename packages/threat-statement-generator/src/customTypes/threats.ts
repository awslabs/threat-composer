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
export interface TemplateThreatStatement {
  id: number;
  statement?: string;
  displayOrder?: number;
  metadata?: { key: string; value: string | string[] }[];
  tags?: string[];
  threatSource?: string;
  prerequisites?: string;
  threatAction?: string;
  threatImpact?: string;
  impactedGoal?: string[];
  impactedAssets?: string[];
  customTemplate?: string;
}

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

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
export interface EntityBase {
  /**
   * The unique Id of the entity
   */
  id: string;
  /**
   * The numeric id of the entity.
   * The numericId will be displayed for users to easy identify the entity.
   */
  numericId: number;
  /**
   * The display order of the entity in the list.
  */
  displayOrder?: number;
  /**
   * The metadata.
   */
  metadata?: { key: string; value: string | string[] }[];
  /**
   * The tags.
   */
  tags?: string[];
}

export interface EntityLinkBase {
  /**
   * The id of linked entity.
   */
  id: string;
}
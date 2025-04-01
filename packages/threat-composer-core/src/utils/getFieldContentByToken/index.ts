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
import { threatFieldData } from '../../data/threatFieldData';
import { TemplateThreatStatement, threatFieldTypeMapping, ThreatFieldTypes } from '../../schemas/threats';
import renderArrayField from '../renderArrayField';

const getFieldContentByToken = (token: ThreatFieldTypes, statement: TemplateThreatStatement): string => {
  const fieldKey = threatFieldTypeMapping[token];
  if (fieldKey) {
    const value = statement[fieldKey as keyof TemplateThreatStatement];
    if (value) {
      if (typeof value === 'string') {
        return value;
      }

      if (Array.isArray(value) && value.length > 0) {
        return renderArrayField(value as string[], token === 'impacted_goal');
      }
    }
  }

  return threatFieldData[token]?.displayField || '';
};

export default getFieldContentByToken;
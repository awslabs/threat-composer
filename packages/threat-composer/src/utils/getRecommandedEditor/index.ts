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
import { TemplateThreatStatement, ThreatFieldTypes, threatFieldTypeMapping } from '../../customTypes';
import calculateFieldCombination from '../calculateFieldCombination';

const allFields = Object.keys(threatFieldTypeMapping);

const getRecommendedEditor = (statement?: TemplateThreatStatement | null) => {
  if (statement) {
    const { fieldCombination, filledField } = calculateFieldCombination(statement);
    if (fieldCombination !== 0) {
      const unFilledFields = allFields.filter(af => !filledField.includes(af));
      const unFilledFieldsLen = unFilledFields.length;
      if (unFilledFieldsLen === 1) {
        return unFilledFields[0] as ThreatFieldTypes;
      }

      if (unFilledFieldsLen > 1) {
        const randomFieldNum = Math.floor(Math.random() * unFilledFieldsLen);
        return unFilledFields[randomFieldNum] as ThreatFieldTypes;
      }

      const randomFieldNum = Math.floor(Math.random() * filledField.length);

      return filledField[randomFieldNum] as ThreatFieldTypes;
    }
  }

  return undefined;
};

export default getRecommendedEditor;
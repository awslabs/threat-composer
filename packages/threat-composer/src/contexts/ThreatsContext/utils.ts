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
import { PerFieldExample, TemplateThreatStatement } from '../../customTypes';

export const addNewValueToStringArray = (arr: string[], newValue?: string) => {
  return newValue && !arr.includes(newValue) ? [...arr, newValue] : arr;
};

export const addNewValueArrayToStringArrayArray = (arr: string[][], newValue?: string[]) => {
  if (newValue && newValue.length > 0) {
    if (!arr.find(strArr => strArr.length === newValue.length && newValue.every(v => strArr.includes(v)))) {
      return [...arr, newValue];
    }
  }

  return arr;
};

export const addNewValueArrayToStringArray = (arr: string[], newValue?: string[]) => {
  if (newValue && newValue.length > 0) {
    return [...arr, ...newValue.filter(v => !arr.includes(v))];
  }

  return arr;
};

export const addNewValueToPerFieldExampleArray = (
  arr: PerFieldExample[],
  field: keyof TemplateThreatStatement,
  newValue: TemplateThreatStatement,
  fromId: number) => {
  return newValue[field] ? [
    ...arr, {
      example: newValue[field] as string,
      fromId,
      stride: [],
    },
  ] : arr;
};
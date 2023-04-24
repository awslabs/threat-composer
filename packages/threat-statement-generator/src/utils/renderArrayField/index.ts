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
const renderArrayField = (input?: string[], includesOr?: boolean): string => {
  const inputLen = input?.length;
  if (!input || inputLen === 0) {
    return '';
  }

  if (inputLen === 1) {
    return input[0];
  }

  return input.slice(0, input.length - 1).join(', ') + (includesOr ? ' and/or ' : ' and ') + input[input.length-1];
};

export default renderArrayField;
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
import { i18n } from 'i18next';
import { DataExchangeFormat } from '../../../../customTypes';

export const getDataflowContent = async (
  data: DataExchangeFormat,
  t?: i18n['t'],
) => {
  const rows: string[] = [];
  const optT = t ? t : (s: string) => s;
  rows.push(`## ${optT('Dataflow')}`);
  if (data.dataflow) {
    if (data.dataflow.description) {
      rows.push(`### ${optT('Introduction')}`);
      rows.push(data.dataflow.description);
    }

    if (data.dataflow.image) {
      rows.push(`### ${optT('Dataflow Diagram')}`);
      rows.push(`![Dataflow Diagram](${data.dataflow.image})`);
    }
  }

  rows.push('\n');

  return rows.join('\n');
};

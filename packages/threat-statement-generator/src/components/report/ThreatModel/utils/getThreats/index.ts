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
import { DataExchangeFormat } from '../../../../../customTypes';
import standardizeNumericId from '../../../../../utils/standardizeNumericId';

export const getThreatsContent = (
  data: DataExchangeFormat,
  threatsOnly = false,
) => {
  const rows: string[] = [];
  rows.push('## Threats');
  rows.push(`| Threat Number | Threat | ${threatsOnly ? '' : 'Assumptions | Mitigations |'} Priority | STRIDE `);
  rows.push(`| --- | --- | ${threatsOnly ? '' : '--- | --- |'} --- | --- |`);

  if (data.threats) {
    data.threats.forEach(x => {
      const mitigationLinks = data.mitigationLinks?.filter(ml => ml.linkedId === x.id) || [];
      const assumpptionLinks = data.assumptionLinks?.filter(al => al.linkedId === x.id) || [];
      const threatId = `T-${standardizeNumericId(x.numericId)}`;
      const assumptionsContent = assumpptionLinks.map(al => {
        const assumption = data.assumptions?.find(a => a.id === al.assumptionId);
        if (assumption) {
          const assumptionId = `A-${standardizeNumericId(assumption.numericId)}`;
          return `[**${assumptionId}**](#${assumptionId}): ${assumption.content}`;
        }
        return null;
      }).filter(al => !!al).join('<br/>');
      const mitigationsContent = mitigationLinks.map(ml => {
        const mitigation = data.mitigations?.find(m => m.id === ml.mitigationId);
        if (mitigation) {
          const mitigationId = `M-${standardizeNumericId(mitigation.numericId)}`;
          return `[**${mitigationId}**](#${mitigationId}): ${mitigation.content}`;
        }
        return null;
      }).filter(ml => !!ml).join('<br/>');
      const priority = x.metadata?.find(m => m.key === 'Priority')?.value || '';
      const STRIDE = ((x.metadata?.find(m => m.key === 'STRIDE')?.value || []) as string[]).join(', ');
      rows.push(`| <a name="${threatId}"></a>${threatId} | ${x.statement} | ${threatsOnly ? '' : `| ${assumptionsContent} | ${mitigationsContent} |`} ${priority} | ${STRIDE} |`);
    });
  }

  return rows.join('\n');
};

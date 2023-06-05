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
import parseTableCellContent from '../parseTableCellContent';

export const getAssumptionsContent = (
  data: DataExchangeFormat,
) => {
  const rows: string[] = [];
  rows.push('## Assumptions');

  rows.push('\n');

  rows.push('| Assumption Number | Assumption | Linked Threats | Linked Mitigations | Comments |');
  rows.push('| --- | --- | --- | --- | --- |');

  if (data.assumptions) {
    data.assumptions?.forEach(x => {
      const threatLinks = data.assumptionLinks?.filter(al => al.assumptionId === x.id && al.type === 'Threat') || [];
      const mitigationLinks = data.assumptionLinks?.filter(al => al.assumptionId === x.id && al.type === 'Mitigation') || [];

      const threatsContent = threatLinks.map(tl => {
        const threat = data.threats?.find(s => s.id === tl.linkedId);
        if (threat) {
          const threatId = `T-${standardizeNumericId(threat.numericId)}`;
          return `[**${threatId}**](#${threatId}): ${threat.statement}`;
        }
        return null;
      }).filter(t => !!t).join('<br/>');

      const mitigationsContent = mitigationLinks.map(tl => {
        const mitigation = data.mitigations?.find(m => m.id === tl.linkedId);
        if (mitigation) {
          const mitigationId = `M-${standardizeNumericId(mitigation.numericId)}`;
          return `[**${mitigationId}**](#${mitigationId}): ${mitigation.content}`;
        }
        return null;
      }).filter(t => !!t).join('<br/>');

      const assumptionId = `A-${standardizeNumericId(x.numericId)}`;
      const comments = (x.metadata?.find(m => m.key === 'Comments')?.value as string) || '';
      rows.push(`| <a name="${assumptionId}"></a>${assumptionId} | ${parseTableCellContent(x.content)} | ${parseTableCellContent(threatsContent)} | ${parseTableCellContent(mitigationsContent)} | ${parseTableCellContent(comments)} |`);
    });
  }

  rows.push('\n');

  return rows.join('\n');
};


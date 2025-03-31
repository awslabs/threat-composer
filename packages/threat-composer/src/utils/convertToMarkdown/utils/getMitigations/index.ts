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
import { DataExchangeFormat, escapeMarkdown, mitigationStatus, standardizeNumericId, STATUS_NOT_SET } from '@aws/threat-composer-core';
import parseTableCellContent from '../../../../utils/parseTableCellContent';

export const getMitigationsContent = async (
  data: DataExchangeFormat,
) => {
  const rows: string[] = [];
  rows.push('## Mitigations');

  rows.push('\n');

  rows.push('| Mitigation Number | Mitigation | Threats Mitigating | Assumptions | Status | Comments |');
  rows.push('| --- | --- | --- | --- | --- | --- |');

  if (data.mitigations) {
    const promises = data.mitigations.map(async (x) => {
      const threats = data.mitigationLinks?.filter(ml => ml.mitigationId === x.id) || [];
      const assumpptionLinks = data.assumptionLinks?.filter(al => al.linkedId === x.id) || [];

      const threatsContent = threats.map(tl => {
        const threat = data.threats?.find(s => s.id === tl.linkedId);
        if (threat) {
          const threatId = `T-${standardizeNumericId(threat.numericId)}`;
          return `[**${threatId}**](#${threatId}): ${escapeMarkdown(threat.statement || '')}`;
        }
        return null;
      }).filter(t => !!t).join('<br/>');

      const assumptionsContent = assumpptionLinks.map(al => {
        const assumption = data.assumptions?.find(a => a.id === al.assumptionId);
        if (assumption) {
          const assumptionId = `A-${standardizeNumericId(assumption.numericId)}`;
          return `[**${assumptionId}**](#${assumptionId}): ${escapeMarkdown(assumption.content)}`;
        }
        return null;
      }).filter(a => !!a).join('<br/>');

      const status = (x.status && mitigationStatus.find(ms => ms.value === x.status)?.label) || STATUS_NOT_SET;

      const comments = await parseTableCellContent((x.metadata?.find(m => m.key === 'Comments')?.value as string) || '');

      const mitigationId = `M-${standardizeNumericId(x.numericId)}`;
      return `| <a name="${mitigationId}"></a>${mitigationId} | ${escapeMarkdown(x.content)} | ${threatsContent} | ${assumptionsContent} | ${status} | ${comments} |`;
    });

    rows.push(...(await Promise.all(promises)));
  }

  rows.push('\n');

  return rows.join('\n');
};

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
import { STATUS_NOT_SET } from '../../../../configs';
import { DataExchangeFormat } from '../../../../customTypes';
import mitigationStatus from '../../../../data/status/mitigationStatus.json';
import escapeMarkdown from '../../../../utils/escapeMarkdown';
import { createHTMLbyDirection } from '../../../../utils/localization';
import parseTableCellContent from '../../../../utils/parseTableCellContent';
import standardizeNumericId from '../../../../utils/standardizeNumericId';

export const getMitigationsContent = async (
  data: DataExchangeFormat,
  t: i18n['t'],
  defaultDir: string,
) => {
  const rows: string[] = [];
  const optT = t;

  rows.push(`## ${optT('Mitigations')}`);

  rows.push('\n');

  rows.push(`| ${optT('Mitigation Number')} | ${optT('Mitigation')} | ${optT('Threats Mitigating')} | ${optT('Assumptions')} | ${optT('Status')} | ${optT('Comments')} |`);
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
      }).filter(tl => !!tl).map(tl => createHTMLbyDirection(tl!!, defaultDir)).join('<br/>');

      const assumptionsContent = assumpptionLinks.map(al => {
        const assumption = data.assumptions?.find(a => a.id === al.assumptionId);
        if (assumption) {
          const assumptionId = `A-${standardizeNumericId(assumption.numericId)}`;
          return `[**${assumptionId}**](#${assumptionId}): ${escapeMarkdown(assumption.content)}`;
        }
        return null;
      }).filter(a => !!a).map(tl => createHTMLbyDirection(tl!!, defaultDir)).join('<br/>');
      const statusContent = (x.status && mitigationStatus.find(ms => ms.value === x.status)?.label) || STATUS_NOT_SET;
      const status = createHTMLbyDirection(optT(statusContent), defaultDir);

      const comments = createHTMLbyDirection(await parseTableCellContent((x.metadata?.find(m => m.key === 'Comments')?.value as string) || ''), defaultDir);

      const mitigationId = createHTMLbyDirection(`M-${standardizeNumericId(x.numericId)}`, defaultDir);
      return `| <a name="${mitigationId}"></a>${mitigationId} | ${createHTMLbyDirection(escapeMarkdown(x.content), defaultDir)} | ${threatsContent} | ${assumptionsContent} | ${status} | ${comments} |`;
    });

    rows.push(...(await Promise.all(promises)));
  }

  rows.push('\n');

  return rows.join('\n');
};

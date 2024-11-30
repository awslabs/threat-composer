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
import { STATUS_NOT_SET } from '../../../../configs/status';
import { DataExchangeFormat } from '../../../../customTypes';
import threatStatus from '../../../../data/status/threatStatus.json';
import escapeMarkdown from '../../../../utils/escapeMarkdown';
import { createHTMLbyDirection } from '../../../../utils/localization';
import parseTableCellContent from '../../../../utils/parseTableCellContent';
import standardizeNumericId from '../../../../utils/standardizeNumericId';

export const getThreatsContent = async (
  data: DataExchangeFormat,
  t: i18n['t'],
  defaultDir: string,
  threatsOnly = false,
) => {
  const rows: string[] = [];
  const optT = t;

  rows.push(`## ${optT('Threats')}`);

  rows.push('\n');

  rows.push(`| ${optT('Threat Number')} | ${optT('Threat')} | ${threatsOnly ? '' : `${optT('Mitigations')} | ${optT('Assumptions')} |`} ${optT('Status')} | ${optT('Priority')} | ${optT('STRIDE')} | ${optT('Comments')} |`);
  rows.push(`| --- | --- | ${threatsOnly ? '' : '--- | --- |'} --- | --- | --- | --- |`);

  if (data.threats) {
    const promises = data.threats.map(async (x) => {
      const mitigationLinks = data.mitigationLinks?.filter(ml => ml.linkedId === x.id) || [];
      const assumpptionLinks = data.assumptionLinks?.filter(al => al.linkedId === x.id) || [];
      const threatId = createHTMLbyDirection(`T-${standardizeNumericId(x.numericId)}`, defaultDir);
      const assumptionsContent = assumpptionLinks.map(al => {
        const assumption = data.assumptions?.find(a => a.id === al.assumptionId);
        if (assumption) {
          const assumptionId = `A-${standardizeNumericId(assumption.numericId)}`;
          return `[**${assumptionId}**](#${assumptionId}): ${escapeMarkdown(assumption.content)}`;
        }
        return null;
      }).filter(al => !!al).map(tl => createHTMLbyDirection(tl!!, defaultDir)).join('<br/>');
      const mitigationsContent = mitigationLinks.map(ml => {
        const mitigation = data.mitigations?.find(m => m.id === ml.mitigationId);
        if (mitigation) {
          const mitigationId = `M-${standardizeNumericId(mitigation.numericId)}`;
          return `[**${mitigationId}**](#${mitigationId}): ${escapeMarkdown(mitigation.content)}`;
        }
        return null;
      }).filter(ml => !!ml).map(tl => createHTMLbyDirection(tl!!, defaultDir)).join('<br/>');
      const status = createHTMLbyDirection(optT(( x.status && threatStatus.find(ts => ts.value === x.status)?.label ) || STATUS_NOT_SET), defaultDir);
      const priority = createHTMLbyDirection(optT(x.metadata?.find(m => m.key === 'Priority')?.value || ''), defaultDir);
      const STRIDE = createHTMLbyDirection(((x.metadata?.find(m => m.key === 'STRIDE')?.value || []) as string[]).join(', '), defaultDir);
      const comments = createHTMLbyDirection(await parseTableCellContent((x.metadata?.find(m => m.key === 'Comments')?.value as string) || ''), defaultDir);
      return `| <a name="${threatId}"></a>${threatId} | ${createHTMLbyDirection(escapeMarkdown(x.statement || ''), defaultDir)} | ${threatsOnly ? '' : `${mitigationsContent} | ${assumptionsContent} | `} ${status} | ${priority} | ${STRIDE} | ${comments} |`;
    });

    rows.push(...(await Promise.all(promises)));
  }

  rows.push('\n');

  return rows.join('\n');
};

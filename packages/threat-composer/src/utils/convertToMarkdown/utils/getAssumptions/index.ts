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
import escapeMarkdown from '../../../../utils/escapeMarkdown';
import { createHTMLbyDirection } from '../../../../utils/localization';
import parseTableCellContent from '../../../../utils/parseTableCellContent';
import standardizeNumericId from '../../../../utils/standardizeNumericId';

export const getAssumptionsContent = async (
  data: DataExchangeFormat,
  t: i18n['t'],
  defaultDir: string,
) => {
  const rows: string[] = [];
  const optT = t;

  rows.push(`## ${optT('Assumptions')}`);

  rows.push('\n');

  rows.push(`| ${optT('Assumption Number')} | ${optT('Assumption')} | ${optT('Linked Threats')} | ${optT('Linked Mitigations')} | ${optT('Comments')} |`);
  rows.push('| --- | --- | --- | --- | --- |');

  if (data.assumptions) {
    const promises = data.assumptions?.map(async (x) => {
      const threatLinks = data.assumptionLinks?.filter(al => al.assumptionId === x.id && al.type === 'Threat') || [];
      const mitigationLinks = data.assumptionLinks?.filter(al => al.assumptionId === x.id && al.type === 'Mitigation') || [];

      const threatsContent = threatLinks.map(tl => {
        const threat = data.threats?.find(s => s.id === tl.linkedId);
        if (threat) {
          const threatId = `T-${standardizeNumericId(threat.numericId)}`;
          return `[**${threatId}**](#${threatId}): ${escapeMarkdown(threat.statement || '')}`;
        }
        return null;
      }).filter(tl => !!tl).map(tl => createHTMLbyDirection(tl!!, defaultDir)).join('<br/>');

      const mitigationsContent = mitigationLinks.map(tl => {
        const mitigation = data.mitigations?.find(m => m.id === tl.linkedId);
        if (mitigation) {
          const mitigationId = `M-${standardizeNumericId(mitigation.numericId)}`;
          return `[**${mitigationId}**](#${mitigationId}): ${escapeMarkdown(mitigation.content)}`;
        }
        return null;
      }).filter(tl => !!tl).map(tl => createHTMLbyDirection(tl!!, defaultDir)).join('<br/>');

      const assumptionId = createHTMLbyDirection(`A-${standardizeNumericId(x.numericId)}`, defaultDir);
      const comments = createHTMLbyDirection(await parseTableCellContent((x.metadata?.find(m => m.key === 'Comments')?.value as string) || ''), defaultDir);
      return `| <a name="${assumptionId}"></a>${assumptionId} | ${createHTMLbyDirection(escapeMarkdown(x.content), defaultDir)} | ${threatsContent} | ${mitigationsContent} | ${comments} |`;
    });

    rows.push(...(await Promise.all(promises)));
  }

  rows.push('\n');

  return rows.join('\n');
};


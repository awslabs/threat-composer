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
import { DataExchangeFormat, TemplateThreatStatement } from '../../../../customTypes';
import escapeMarkdown from '../../../../utils/escapeMarkdown';
import { createHTMLbyDirection } from '../../../../utils/localization';
import standardizeNumericId from '../../../../utils/standardizeNumericId';

export const getAssetsContent = async (
  data: DataExchangeFormat,
  t: i18n['t'],
  defaultDir: string,
) => {
  const rows: string[] = [];
  const optT = t;

  rows.push(`## ${optT('Impacted Assets')}`);

  rows.push('\n');

  rows.push(`| ${optT('Assets Number')} | ${optT('Asset')} | ${optT('Related Threats')} |`);
  rows.push('| --- | --- | --- |');

  if (data.threats) {
    const assetThreatMap: {
      [assetName: string]: TemplateThreatStatement[];
    } = {};

    data.threats.forEach(tl => tl.impactedAssets?.forEach(ia => {
      if (!assetThreatMap[ia]) {
        assetThreatMap[ia] = [];
      }

      assetThreatMap[ia].push(tl);
    }));

    const promises = Object.keys(assetThreatMap).map(async (at, index) => {
      const atId = createHTMLbyDirection(`AS-${standardizeNumericId(index + 1)})`, defaultDir);

      const threatsContent = assetThreatMap[at].map(tl => {
        const threatId = `T-${standardizeNumericId(tl.numericId)}`;
        return `[**${threatId}**](#${threatId}): ${createHTMLbyDirection(escapeMarkdown((tl.statement || '')), defaultDir)}`;
      }).map(tl => createHTMLbyDirection(tl!!, defaultDir)).join('<br/>');

      return `| ${atId} | ${createHTMLbyDirection(escapeMarkdown(at), defaultDir)} | ${threatsContent} |`;
    });

    rows.push(...(await Promise.all(promises)));
  }

  rows.push('\n');

  return rows.join('\n');
};

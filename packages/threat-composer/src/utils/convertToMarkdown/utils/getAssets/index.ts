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
import { DataExchangeFormat, TemplateThreatStatement } from '../../../../customTypes';
import escapeMarkdown from '../../../../utils/escapeMarkdown';
import standardizeNumericId from '../../../../utils/standardizeNumericId';

export const getAssetsContent = async (
  data: DataExchangeFormat,
) => {
  const rows: string[] = [];
  rows.push('## Impacted Assets');

  rows.push('\n');

  rows.push('| Assets Number | Asset | Related Threats |');
  rows.push('| --- | --- | --- |');

  if (data.threats) {
    const assetThreatMap: {
      [assetName: string]: TemplateThreatStatement[];
    } = {};

    data.threats.forEach(t => t.impactedAssets?.forEach(ia => {
      if (!assetThreatMap[ia]) {
        assetThreatMap[ia] = [];
      }

      assetThreatMap[ia].push(t);
    }));

    const promises = Object.keys(assetThreatMap).map(async (at, index) => {
      const atId = `AS-${standardizeNumericId(index + 1)}`;

      const threatsContent = assetThreatMap[at].map(t => {
        const threatId = `T-${standardizeNumericId(t.numericId)}`;
        return `[**${threatId}**](#${threatId}): ${escapeMarkdown((t.statement || ''))}`;
      }).join('<br/>');

      return `| ${atId} | ${escapeMarkdown(at)} | ${threatsContent} |`;
    });

    rows.push(...(await Promise.all(promises)));
  }

  rows.push('\n');

  return rows.join('\n');
};

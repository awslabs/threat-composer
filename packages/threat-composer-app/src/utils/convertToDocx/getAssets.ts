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
import { DataExchangeFormat, standardizeNumericId, TemplateThreatStatement } from '@aws/threat-composer-core';
import { Paragraph, HeadingLevel, TextRun, TableCell, TableRow } from 'docx';
import Table from './components/Table';
import getAnchorLink from './getAnchorLink';
import getBookmark from './getBookmark';
import getHeaderRow from './getHeaderRow';

interface AssetMap {
  [assetName: string]: TemplateThreatStatement[];
}

const getThreatsTableCell = (threats: TemplateThreatStatement[]) => {
  return new TableCell({
    children: threats.map(t => {
      const threatId = `T-${standardizeNumericId(t.numericId)}`;
      return new Paragraph({
        children: [
          getAnchorLink(threatId),
          new TextRun(' '),
          new TextRun(t.statement || ''),
        ],
      });
    }),
  });
};

const getDataRow = (assetName: string, index: number, assetMap: AssetMap) => {
  const atId = `AS-${standardizeNumericId(index + 1)}`;

  const tableRow = new TableRow({
    children: [
      new TableCell({
        children: [new Paragraph({
          children: [
            getBookmark(atId),
          ],
        })],
      }),
      new TableCell({
        children: [new Paragraph(assetName)],
      }),
      getThreatsTableCell(assetMap[assetName] || []),
    ],
  });

  return tableRow;
};

const getDataRows = (data: DataExchangeFormat) => {
  if (data.threats) {
    const assetThreatMap: AssetMap = {};

    data.threats.forEach(t => t.impactedAssets?.forEach(ia => {
      if (!assetThreatMap[ia]) {
        assetThreatMap[ia] = [];
      }

      assetThreatMap[ia].push(t);
    }));

    return Object.keys(assetThreatMap).map((at, index) => getDataRow(at, index, assetThreatMap));
  }

  return [];
};

const getAssets = async (
  data: DataExchangeFormat,
) => {
  const children: any[] = [];

  children.push(new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [
      new TextRun('Impacted Assets'),
    ],
  }));

  const headerRow = getHeaderRow(['Assets Number', 'Asset', 'Related Threats ']);
  const dataRows = getDataRows(data);

  const table = new Table({
    rows: [
      headerRow,
      ...dataRows,
    ],
  });

  children.push(table);

  return children;
};

export default getAssets;

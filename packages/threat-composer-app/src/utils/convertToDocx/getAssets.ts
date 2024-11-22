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
import { TemplateThreatStatement, DataExchangeFormat, standardizeNumericId } from '@aws/threat-composer';
import { Paragraph, HeadingLevel, TextRun, TableCell, TableRow } from 'docx';
import { i18n } from 'i18next';
import Table from './components/Table';
import { bidirectionalOfText } from './convertMarkdown/utils';
import getAnchorLink from './getAnchorLink';
import getBookmark from './getBookmark';
import getHeaderRow from './getHeaderRow';

interface AssetMap {
  [assetName: string]: TemplateThreatStatement[];
}

const getThreatsTableCell = (threats: TemplateThreatStatement[], defaultDir: boolean) => {
  return new TableCell({
    children: threats.map(t => {
      const threatId = `T-${standardizeNumericId(t.numericId)}`;
      console.log('TableCell', bidirectionalOfText(threatId + t.statement, defaultDir));
      return new Paragraph({
        bidirectional: bidirectionalOfText(threatId + t.statement, defaultDir),
        children: [
          getAnchorLink(threatId),
          new TextRun(' '),
          new TextRun(t.statement || ''),
        ],
      });
    }),
  });
};

const getDataRow = (assetName: string, index: number, assetMap: AssetMap, defaultDir: boolean) => {
  const atId = `AS-${standardizeNumericId(index + 1)}`;

  const tableRow = new TableRow({
    children: [
      new TableCell({
        children: [new Paragraph({
          bidirectional: bidirectionalOfText(atId, defaultDir),
          children: [
            getBookmark(atId),
          ],
        })],
      }),
      new TableCell({
        children: [new Paragraph({
          bidirectional: bidirectionalOfText(assetName, defaultDir),
          text: assetName,
        })],
      }),
      getThreatsTableCell(assetMap[assetName] || [], defaultDir),
    ],
  });

  return tableRow;
};

const getDataRows = (data: DataExchangeFormat, defaultDir: boolean) => {
  if (data.threats) {
    const assetThreatMap: AssetMap = {};

    data.threats.forEach(t => t.impactedAssets?.forEach(ia => {
      if (!assetThreatMap[ia]) {
        assetThreatMap[ia] = [];
      }

      assetThreatMap[ia].push(t);
    }));

    return Object.keys(assetThreatMap).map((at, index) => getDataRow(at, index, assetThreatMap, defaultDir));
  }

  return [];
};

const getAssets = async (
  data: DataExchangeFormat,
  defaultDir: boolean = false,
  t?: i18n['t'],
) => {
  const children: any[] = [];
  const translate = ((s: string): string => t ? t(s) : s);

  children.push(new Paragraph({
    bidirectional: defaultDir,
    heading: HeadingLevel.HEADING_1,
    children: [
      new TextRun(translate('Impacted Assets')),
    ],
  }));

  const headerRow = getHeaderRow(['Assets Number', 'Asset', 'Related Threats '].map(translate));
  const dataRows = getDataRows(data, defaultDir);

  const table = new Table({
    visuallyRightToLeft: defaultDir,
    rows: [
      headerRow,
      ...dataRows,
    ],
  });

  children.push(table);

  return children;
};

export default getAssets;

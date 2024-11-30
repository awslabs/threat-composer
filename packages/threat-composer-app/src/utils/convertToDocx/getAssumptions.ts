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
import { Assumption, AssumptionLink, DataExchangeFormat, standardizeNumericId } from '@aws/threat-composer';
import { Paragraph, HeadingLevel, TextRun, TableCell, TableRow } from 'docx';
import { i18n } from 'i18next';
import Table from './components/Table';
import { bidirectionalOfText } from './convertMarkdown/utils';
import getAnchorLink from './getAnchorLink';
import getBookmark from './getBookmark';
import getHeaderRow from './getHeaderRow';
import renderComment from './renderComments';

const getThreatLinksCell = (threatLinks: AssumptionLink[], data: DataExchangeFormat, defaultDir: boolean) => {
  return new TableCell({
    children: threatLinks.map(tl => {
      const threat = data.threats?.find(m => m.id === tl.linkedId);
      if (threat) {
        const threatId = `T-${standardizeNumericId(threat.numericId)}`;
        return new Paragraph({
          bidirectional: bidirectionalOfText(threatId + threat.statement, defaultDir),
          children: [
            getAnchorLink(threatId),
            new TextRun(' '),
            new TextRun(threat.statement || ''),
          ],
        });
      }
      return null;
    }).filter(t => !!t) as Paragraph[],
  });
};

const getMitigationLinksCell = (mitigationLinks: AssumptionLink[], data: DataExchangeFormat, defaultDir: boolean) => {
  return new TableCell({
    children: mitigationLinks.map(ml => {
      const mitigation = data.mitigations?.find(m => m.id === ml.linkedId);
      if (mitigation) {
        const mitigationId = `M-${standardizeNumericId(mitigation.numericId)}`;
        return new Paragraph({
          bidirectional: bidirectionalOfText(mitigationId + mitigation.content, defaultDir),
          children: [
            getAnchorLink(mitigationId),
            new TextRun(' '),
            new TextRun(mitigation.content),
          ],
        });
      }
      return null;
    }).filter(t => !!t) as Paragraph[],
  });
};

const getDataRow = async (
  assumption: Assumption,
  data: DataExchangeFormat,
  defaultDir: boolean = false,
) => {
  const assumptionId = `A-${standardizeNumericId(assumption.numericId)}`;
  const threatLinks = data.assumptionLinks?.filter(al => al.assumptionId === assumption.id && al.type === 'Threat') || [];
  const mitigationLinks = data.assumptionLinks?.filter(al => al.assumptionId === assumption.id && al.type === 'Mitigation') || [];
  const renderedComents = await renderComment(assumption.metadata, defaultDir);

  const tableRow = new TableRow({
    children: [
      new TableCell({
        children: [new Paragraph({
          bidirectional: bidirectionalOfText(assumptionId, defaultDir),
          children: [
            getBookmark(assumptionId),
          ],
        })],
      }),
      new TableCell({
        children: [new Paragraph({
          text: assumption.content,
          bidirectional: bidirectionalOfText(assumption.content, defaultDir),
        })],
      }),
      getThreatLinksCell(threatLinks, data, defaultDir),
      getMitigationLinksCell(mitigationLinks, data, defaultDir),
      new TableCell({
        children: renderedComents,
      }),
    ],
  });

  return tableRow;
};

const getDataRows = async (
  data: DataExchangeFormat,
  defaultDir: boolean = false,
) => {
  const promises = data.assumptions?.map(async (x) => getDataRow(x, data, defaultDir)) || [];
  return Promise.all(promises);
};

const getAssumptions = async (
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
      new TextRun(translate('Assumptions')),
    ],
  }));

  const dataRows = await getDataRows(data, defaultDir);

  const table = new Table({
    visuallyRightToLeft: defaultDir,
    rows: [
      getHeaderRow(['Assumption Number', 'Assumption', 'Linked Threats', 'Linked Mitigations', 'Comments'].map(translate)),
      ...dataRows,
    ],
  });

  children.push(table);

  return children;
};

export default getAssumptions;


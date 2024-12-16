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
import { Mitigation, MitigationLink, AssumptionLink, DataExchangeFormat, standardizeNumericId, mitigationStatus, STATUS_NOT_SET } from '@aws/threat-composer';
import { Paragraph, HeadingLevel, TextRun, TableCell, TableRow } from 'docx';
import { i18n } from 'i18next';
import Table from './components/Table';
import { bidirectionalOfText } from './convertMarkdown/utils';
import getAnchorLink from './getAnchorLink';
import getBookmark from './getBookmark';
import getHeaderRow from './getHeaderRow';
import renderComment from './renderComments';

const getAssumptionLinksCell = (assumptionLinks: AssumptionLink[], data: DataExchangeFormat, defaultDir: boolean) => {
  return new TableCell({
    children: assumptionLinks.map(al => {
      const assumption = data.assumptions?.find(m => m.id === al.assumptionId);
      if (assumption) {
        const assumptionId = `A-${standardizeNumericId(assumption.numericId)}`;
        return new Paragraph({
          bidirectional: bidirectionalOfText(assumptionId + assumption.content, defaultDir),
          children: [
            getAnchorLink(assumptionId),
            new TextRun(' '),
            new TextRun(assumption.content),
          ],
        });
      }
      return null;
    }).filter(t => !!t) as Paragraph[],
  });
};


const getThreatLinksCell = (mitigationLinks: MitigationLink[], data: DataExchangeFormat, defaultDir: boolean) => {
  return new TableCell({
    children: mitigationLinks.map(ml => {
      const threat = data.threats?.find(t => t.id === ml.linkedId);
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

const getDataRow = async (mitigation: Mitigation, data: DataExchangeFormat, defaultDir: boolean) => {
  const mitigationId = `M-${standardizeNumericId(mitigation.numericId)}`;
  const threatLinks = data.mitigationLinks?.filter(ml => ml.mitigationId === mitigation.id) || [];
  const assumptionLinks = data.assumptionLinks?.filter(al => al.linkedId === mitigation.id) || [];
  const status = (mitigation.status && mitigationStatus.find(ms => ms.value === mitigation.status)?.label) || STATUS_NOT_SET;
  const renderedComents = await renderComment(mitigation.metadata, defaultDir);

  const tableRow = new TableRow({
    children: [
      new TableCell({
        children: [new Paragraph({
          bidirectional: bidirectionalOfText(mitigationId, defaultDir),
          children: [
            getBookmark(mitigationId),
          ],
        })],
      }),
      new TableCell({
        children: [new Paragraph({
          bidirectional: bidirectionalOfText(mitigation.content, defaultDir),
          text: mitigation.content,
        })],
      }),
      getThreatLinksCell(threatLinks, data, defaultDir),
      getAssumptionLinksCell(assumptionLinks, data, defaultDir),
      new TableCell({
        children: [new Paragraph({
          bidirectional: bidirectionalOfText(status, defaultDir),
          text: status,
        })],
      }),
      new TableCell({
        children: renderedComents,
      }),
    ],
  });

  return tableRow;
};

const getDataRows = async (data: DataExchangeFormat, defaultDir: boolean) => {
  const promises = data.mitigations?.map(async (x) => getDataRow(x, data, defaultDir)) || [];
  return Promise.all(promises);
};

const getMitigations = async (
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
      new TextRun(translate('Mitigations')),
    ],
  }));

  const dataRows = await getDataRows(data, defaultDir);

  const table = new Table({
    visuallyRightToLeft: defaultDir,
    rows: [
      getHeaderRow(['Mitigation Number', 'Mitigation', 'Threats Mitigating', 'Assumptions', 'Status', 'Comments'].map(translate)),
      ...dataRows,
    ],
  });

  children.push(table);

  return children;
};

export default getMitigations;

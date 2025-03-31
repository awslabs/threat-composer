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
import { DataExchangeFormat, standardizeNumericId, STATUS_NOT_SET } from '@aws/threat-composer';
import { AssumptionLink, Mitigation, MitigationLink, mitigationStatus } from '@aws/threat-composer-core';
import { Paragraph, HeadingLevel, TextRun, TableCell, TableRow } from 'docx';
import Table from './components/Table';
import getAnchorLink from './getAnchorLink';
import getBookmark from './getBookmark';
import getHeaderRow from './getHeaderRow';
import renderComment from './renderComments';

const getAssumptionLinksCell = (assumptionLinks: AssumptionLink[], data: DataExchangeFormat) => {
  return new TableCell({
    children: assumptionLinks.map(al => {
      const assumption = data.assumptions?.find(m => m.id === al.assumptionId);
      if (assumption) {
        const assumptionId = `A-${standardizeNumericId(assumption.numericId)}`;
        return new Paragraph({
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


const getThreatLinksCell = (mitigationLinks: MitigationLink[], data: DataExchangeFormat) => {
  return new TableCell({
    children: mitigationLinks.map(ml => {
      const threat = data.threats?.find(t => t.id === ml.linkedId);
      if (threat) {
        const threatId = `T-${standardizeNumericId(threat.numericId)}`;
        return new Paragraph({
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

const getDataRow = async (mitigation: Mitigation, data: DataExchangeFormat) => {
  const mitigationId = `M-${standardizeNumericId(mitigation.numericId)}`;
  const threatLinks = data.mitigationLinks?.filter(ml => ml.mitigationId === mitigation.id) || [];
  const assumptionLinks = data.assumptionLinks?.filter(al => al.linkedId === mitigation.id) || [];
  const status = (mitigation.status && mitigationStatus.find(ms => ms.value === mitigation.status)?.label) || STATUS_NOT_SET;
  const renderedComents = await renderComment(mitigation.metadata);

  const tableRow = new TableRow({
    children: [
      new TableCell({
        children: [new Paragraph({
          children: [
            getBookmark(mitigationId),
          ],
        })],
      }),
      new TableCell({
        children: [new Paragraph(mitigation.content)],
      }),
      getThreatLinksCell(threatLinks, data),
      getAssumptionLinksCell(assumptionLinks, data),
      new TableCell({
        children: [new Paragraph(status)],
      }),
      new TableCell({
        children: renderedComents,
      }),
    ],
  });

  return tableRow;
};

const getDataRows = async (data: DataExchangeFormat) => {
  const promises = data.mitigations?.map(async (x) => getDataRow(x, data)) || [];
  return Promise.all(promises);
};

const getMitigations = async (
  data: DataExchangeFormat,
) => {
  const children: any[] = [];

  children.push(new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [
      new TextRun('Mitigations'),
    ],
  }));

  const dataRows = await getDataRows(data);

  const table = new Table({
    rows: [
      getHeaderRow(['Mitigation Number', 'Mitigation', 'Threats Mitigating', 'Assumptions', 'Status', 'Comments']),
      ...dataRows,
    ],
  });

  children.push(table);

  return children;
};

export default getMitigations;

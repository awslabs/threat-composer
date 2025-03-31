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
import { standardizeNumericId } from '@aws/threat-composer';
import { Assumption, AssumptionLink, DataExchangeFormat } from '@aws/threat-composer-core';
import { Paragraph, HeadingLevel, TextRun, TableCell, TableRow } from 'docx';
import Table from './components/Table';
import getAnchorLink from './getAnchorLink';
import getBookmark from './getBookmark';
import getHeaderRow from './getHeaderRow';
import renderComment from './renderComments';

const getThreatLinksCell = (threatLinks: AssumptionLink[], data: DataExchangeFormat) => {
  return new TableCell({
    children: threatLinks.map(tl => {
      const threat = data.threats?.find(m => m.id === tl.linkedId);
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

const getMitigationLinksCell = (mitigationLinks: AssumptionLink[], data: DataExchangeFormat) => {
  return new TableCell({
    children: mitigationLinks.map(ml => {
      const mitigation = data.mitigations?.find(m => m.id === ml.linkedId);
      if (mitigation) {
        const mitigationId = `M-${standardizeNumericId(mitigation.numericId)}`;
        return new Paragraph({
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

const getDataRow = async (assumption: Assumption, data: DataExchangeFormat) => {
  const assumptionId = `A-${standardizeNumericId(assumption.numericId)}`;
  const threatLinks = data.assumptionLinks?.filter(al => al.assumptionId === assumption.id && al.type === 'Threat') || [];
  const mitigationLinks = data.assumptionLinks?.filter(al => al.assumptionId === assumption.id && al.type === 'Mitigation') || [];
  const renderedComents = await renderComment(assumption.metadata);

  const tableRow = new TableRow({
    children: [
      new TableCell({
        children: [new Paragraph({
          children: [
            getBookmark(assumptionId),
          ],
        })],
      }),
      new TableCell({
        children: [new Paragraph(assumption.content)],
      }),
      getThreatLinksCell(threatLinks, data),
      getMitigationLinksCell(mitigationLinks, data),
      new TableCell({
        children: renderedComents,
      }),
    ],
  });

  return tableRow;
};

const getDataRows = async (data: DataExchangeFormat) => {
  const promises = data.assumptions?.map(async (x) => getDataRow(x, data)) || [];
  return Promise.all(promises);
};

const getAssumptions = async (
  data: DataExchangeFormat,
) => {
  const children: any[] = [];

  children.push(new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [
      new TextRun('Assumptions'),
    ],
  }));

  const dataRows = await getDataRows(data);

  const table = new Table({
    rows: [
      getHeaderRow(['Assumption Number', 'Assumption', 'Linked Threats', 'Linked Mitigations', 'Comments']),
      ...dataRows,
    ],
  });

  children.push(table);

  return children;
};

export default getAssumptions;


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
import { AssumptionLink, DataExchangeFormat, MitigationLink, TemplateThreatStatement, threatStatus, STATUS_NOT_SET } from '@aws/threat-composer-core';
import { Paragraph, HeadingLevel, TextRun, TableRow, TableCell } from 'docx';
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

const getMitigationLinksCell = (mitigationLinks: MitigationLink[], data: DataExchangeFormat) => {
  return new TableCell({
    children: mitigationLinks.map(ml => {
      const mitigation = data.mitigations?.find(m => m.id === ml.mitigationId);
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

const getDataRow = async (threat: TemplateThreatStatement, data: DataExchangeFormat) => {
  const mitigationLinks = data.mitigationLinks?.filter(ml => ml.linkedId === threat.id) || [];
  const assumptionLinks = data.assumptionLinks?.filter(al => al.linkedId === threat.id) || [];
  const threatId = `T-${standardizeNumericId(threat.numericId)}`;
  const comments = await renderComment(threat.metadata);
  const status = (threat.status && threatStatus.find(x => x.value === threat.status)?.label) || STATUS_NOT_SET;
  const priority = threat.metadata?.find(m => m.key === 'Priority')?.value as string || '';
  const STRIDE = ((threat.metadata?.find(m => m.key === 'STRIDE')?.value || []) as string[]).join(', ');

  const tableRow = new TableRow({
    children: [
      new TableCell({
        children: [new Paragraph({
          children: [
            getBookmark(threatId),
          ],
        })],
      }),
      new TableCell({
        children: [new Paragraph(threat.statement || '')],
      }),
      getMitigationLinksCell(mitigationLinks, data),
      getAssumptionLinksCell(assumptionLinks, data),
      new TableCell({
        children: [new Paragraph(status)],
      }),
      new TableCell({
        children: [new Paragraph(priority)],
      }),
      new TableCell({
        children: [new Paragraph(STRIDE)],
      }),
      new TableCell({
        children: comments,
      }),
    ],
  });

  return tableRow;
};

const getDataRows = async (data: DataExchangeFormat) => {
  const promises = data.threats?.map(async (x) => getDataRow(x, data)) || [];
  return Promise.all(promises);
};

const getThreats = async (
  data: DataExchangeFormat,
  threatsOnly = false,
) => {
  const children: any[] = [];

  children.push(new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [
      new TextRun('Threats'),
    ],
  }));

  const dataRows = await getDataRows(data);

  const table = new Table({
    rows: [
      getHeaderRow(
        threatsOnly ? ['Threat Number', 'Threat', 'Status', 'Priority', 'STRIDE', 'Comments']
          : ['Threat Number', 'Threat', 'Mitigations', 'Assumptions', 'Status', 'Priority', 'STRIDE', 'Comments']),
      ...dataRows,
    ],
  });

  children.push(table);

  return children;
};

export default getThreats;
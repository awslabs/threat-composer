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
import { AssumptionLink, DataExchangeFormat, MitigationLink, TemplateThreatStatement, standardizeNumericId, threatStatus, STATUS_NOT_SET } from '@aws/threat-composer';
import { Paragraph, HeadingLevel, TextRun, TableRow, TableCell } from 'docx';
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
          bidirectional: bidirectionalOfText(assumptionId+assumption.content, defaultDir),
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

const getMitigationLinksCell = (mitigationLinks: MitigationLink[], data: DataExchangeFormat, defaultDir:boolean) => {
  return new TableCell({
    children: mitigationLinks.map(ml => {
      const mitigation = data.mitigations?.find(m => m.id === ml.mitigationId);
      if (mitigation) {
        const mitigationId = `M-${standardizeNumericId(mitigation.numericId)}`;
        return new Paragraph({
          bidirectional: bidirectionalOfText(mitigationId+mitigation.content, defaultDir),
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

const getDataRow = async (threat: TemplateThreatStatement, data: DataExchangeFormat, defaultDir: boolean) => {
  const mitigationLinks = data.mitigationLinks?.filter(ml => ml.linkedId === threat.id) || [];
  const assumptionLinks = data.assumptionLinks?.filter(al => al.linkedId === threat.id) || [];
  const threatId = `T-${standardizeNumericId(threat.numericId)}`;
  const comments = await renderComment(threat.metadata, defaultDir);
  const status = (threat.status && threatStatus.find(x => x.value === threat.status)?.label) || STATUS_NOT_SET;
  const priority = threat.metadata?.find(m => m.key === 'Priority')?.value as string || '';
  const STRIDE = ((threat.metadata?.find(m => m.key === 'STRIDE')?.value || []) as string[]).join(', ');

  const tableRow = new TableRow({
    children: [
      new TableCell({
        children: [new Paragraph({
          bidirectional: bidirectionalOfText(threatId, defaultDir),
          children: [
            getBookmark(threatId),
          ],
        })],
      }),
      new TableCell({
        children: [new Paragraph({
          bidirectional: bidirectionalOfText(threat.statement || '', defaultDir),
          text: threat.statement || '',
        })],
      }),
      getMitigationLinksCell(mitigationLinks, data, defaultDir),
      getAssumptionLinksCell(assumptionLinks, data, defaultDir),
      new TableCell({
        children: [new Paragraph({
          bidirectional: bidirectionalOfText(status, defaultDir),
          text: status,
        })],
      }),
      new TableCell({
        children: [new Paragraph({
          bidirectional: bidirectionalOfText(priority, defaultDir),
          text: priority,
        })],
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

const getDataRows = async (data: DataExchangeFormat, defaultDir: boolean) => {
  const promises = data.threats?.map(async (x) => getDataRow(x, data, defaultDir)) || [];
  return Promise.all(promises);
};

const getThreats = async (
  data: DataExchangeFormat,
  threatsOnly = false,
  defaultDir: boolean = false,
  t?: i18n['t'],
) => {
  const children: any[] = [];
  const translate = ((s: string): string => t ? t(s) : s);

  children.push(new Paragraph({
    bidirectional: defaultDir,
    heading: HeadingLevel.HEADING_1,
    children: [
      new TextRun(translate('Threats')),
    ],
  }));

  const dataRows = await getDataRows(data, defaultDir);

  const table = new Table({
    visuallyRightToLeft: defaultDir,
    rows: [
      getHeaderRow(
        (threatsOnly ? ['Threat Number', 'Threat', 'Status', 'Priority', 'STRIDE', 'Comments']
          : ['Threat Number', 'Threat', 'Mitigations', 'Assumptions', 'Status', 'Priority', 'STRIDE', 'Comments']).map(translate)),
      ...dataRows,
    ],
  });

  children.push(table);

  return children;
};

export default getThreats;
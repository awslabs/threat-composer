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
import { AssumptionLink, DataExchangeFormat, MitigationLink, TemplateThreatStatement, standardizeNumericId } from '@aws/threat-composer';
import { Paragraph, HeadingLevel, TextRun, Table, TableRow, TableCell } from 'docx';
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
        threatsOnly ? ['Threat Number', 'Threat', 'Comments', 'Priority', 'STRIDE', 'Comments']
          : ['Threat Number', 'Threat', 'Mitigations', 'Assumptions', 'Priority', 'STRIDE', 'Comments']),
      ...dataRows,
    ],
  });

  children.push(table);

  return children;
  // const rows: string[] = [];
  // rows.push('## Threats');

  // rows.push('\n');

  // rows.push(`| Threat Number | Threat | ${threatsOnly ? '' : 'Mitigations | Assumptions |'} Priority | STRIDE | Comments |`);
  // rows.push(`| --- | --- | ${threatsOnly ? '' : '--- | --- |'} --- | --- | --- |`);

  // if (data.threats) {
  //   const promises = data.threats.map(async (x) => {
  //     const mitigationLinks = data.mitigationLinks?.filter(ml => ml.linkedId === x.id) || [];
  //     const assumpptionLinks = data.assumptionLinks?.filter(al => al.linkedId === x.id) || [];
  //     const threatId = `T-${standardizeNumericId(x.numericId)}`;
  //     const assumptionsContent = assumpptionLinks.map(al => {
  //       const assumption = data.assumptions?.find(a => a.id === al.assumptionId);
  //       if (assumption) {
  //         const assumptionId = `A-${standardizeNumericId(assumption.numericId)}`;
  //         return `[**${assumptionId}**](#${assumptionId}): ${escapeMarkdown(assumption.content)}`;
  //       }
  //       return null;
  //     }).filter(al => !!al).join('<br/>');
  //     const mitigationsContent = mitigationLinks.map(ml => {
  //       const mitigation = data.mitigations?.find(m => m.id === ml.mitigationId);
  //       if (mitigation) {
  //         const mitigationId = `M-${standardizeNumericId(mitigation.numericId)}`;
  //         return `[**${mitigationId}**](#${mitigationId}): ${escapeMarkdown(mitigation.content)}`;
  //       }
  //       return null;
  //     }).filter(ml => !!ml).join('<br/>');
  //     const priority = x.metadata?.find(m => m.key === 'Priority')?.value || '';
  //     const STRIDE = ((x.metadata?.find(m => m.key === 'STRIDE')?.value || []) as string[]).join(', ');
  //     const comments = await parseTableCellContent((x.metadata?.find(m => m.key === 'Comments')?.value as string) || '');
  //     return `| <a name="${threatId}"></a>${threatId} | ${escapeMarkdown(x.statement || '')} | ${threatsOnly ? '' : `${mitigationsContent} | ${assumptionsContent} | `} ${priority} | ${STRIDE} | ${comments} |`;
  //   });

  //   rows.push(...(await Promise.all(promises)));
  // }

  // rows.push('\n');

  // return rows.join('\n');
};

export default getThreats;
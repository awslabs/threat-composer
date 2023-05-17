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
import Header from '@cloudscape-design/components/header';
import SpaceBetween from '@cloudscape-design/components/space-between';
import { FC, useMemo } from 'react';
import { useAssumptionLinksContext } from '../../../../../contexts/AssumptionLinksContext/context';
import { useAssumptionsContext } from '../../../../../contexts/AssumptionsContext/context';
import { useMitigationLinksContext } from '../../../../../contexts/MitigationLinksContext/context';
import { useMitigationsContext } from '../../../../../contexts/MitigationsContext/context';
import { useThreatsContext } from '../../../../../contexts/ThreatsContext/context';
import standardizeNumericId from '../../../../../utils/standardizeNumericId';
import MarkdownViewer from '../../../../generic/MarkdownViewer';

const Threats: FC = () => {
  const { statementList } = useThreatsContext();
  const { mitigationList } = useMitigationsContext();
  const { getLinkedMitigationLinks } = useMitigationLinksContext();
  const { assumptionList } = useAssumptionsContext();
  const { getLinkedAssumptionLinks } = useAssumptionLinksContext();

  const content: string = useMemo(() => {
    const rows: string[] = [];
    rows.push('| Threat Number | Threat | Assumptions | Mitigations |');
    rows.push('| --- | --- | --- | --- |');

    statementList.forEach(x => {
      const mitigationLinks = getLinkedMitigationLinks(x.id);
      const assumpptionLinks = getLinkedAssumptionLinks(x.id);
      rows.push(`| T-${standardizeNumericId(x.numericId)} | ${x.statement} | ${
        assumpptionLinks.map(al => {
          const assumption = assumptionList.find(a => a.id === al.assumptionId);
          if (assumption) {
            return `**A-${standardizeNumericId(assumption.numericId)}**: ${assumption.content}`;
          }
          return null;
        }).filter(al => !!al).join(';')
      } | ${
        mitigationLinks.map(ml => {
          const mitigation = mitigationList.find(m => m.id === ml.mitigationId);
          if (mitigation) {
            return `**M-${standardizeNumericId(mitigation.numericId)}**: ${mitigation.content}`;
          }
          return null;
        }).filter(ml => !!ml).join(';')
      } |`);
    });
    return rows.join('\n');
  }, [statementList, mitigationList, assumptionList, getLinkedAssumptionLinks, getLinkedMitigationLinks]);

  return (<SpaceBetween direction='vertical' size='s'>
    <Header variant='h2'>Threats</Header>
    <MarkdownViewer>
      {content}
    </MarkdownViewer>
  </SpaceBetween>);
};

export default Threats;
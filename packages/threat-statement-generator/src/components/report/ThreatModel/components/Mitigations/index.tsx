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

const Mitigations: FC = () => {
  const { mitigationList } = useMitigationsContext();
  const { getMitigtaionThreatLinks } = useMitigationLinksContext();
  const { statementList } = useThreatsContext();
  const { assumptionList } = useAssumptionsContext();
  const { getLinkedAssumptionLinks } = useAssumptionLinksContext();

  const content: string = useMemo(() => {
    const rows: string[] = [];
    rows.push('| Mitigation Number | Mitigation | Threats Mitigating | Assumptions');
    rows.push('| --- | --- | --- | --- |');

    mitigationList.forEach(x => {
      const threats = getMitigtaionThreatLinks(x.id);
      const assumpptionLinks = getLinkedAssumptionLinks(x.id);

      rows.push(`| M-${standardizeNumericId(x.numericId)} | ${x.content} | ${
        threats.map(tl => {
          const threat = statementList.find(s => s.id === tl.linkedId);
          if (threat) {
            return `**T-${standardizeNumericId(threat.numericId)}**: ${threat.statement}`;
          }
          return null;
        }).filter(t => !!t).join('; ')
      } | ${
        assumpptionLinks.map(al => {
          const assumption = assumptionList.find(a => a.id === al.assumptionId);
          if (assumption) {
            return `**A-${standardizeNumericId(assumption.numericId)}**: ${assumption.content}`;
          }
          return null;
        }).filter(a => !!a).join('; ')
      } |`);
    });
    return rows.join('\n');
  }, [mitigationList, statementList, assumptionList, getLinkedAssumptionLinks, getMitigtaionThreatLinks]);

  return (<SpaceBetween direction='vertical' size='s'>
    <Header variant='h2'>Mitigations</Header>
    <MarkdownViewer>
      {content}
    </MarkdownViewer>
  </SpaceBetween>);
};

export default Mitigations;
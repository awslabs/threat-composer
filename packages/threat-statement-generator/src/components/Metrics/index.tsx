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
import { TextContent } from '@cloudscape-design/components';
import Container from '@cloudscape-design/components/container';
import SpaceBetween from '@cloudscape-design/components/space-between';
import { FC } from 'react';
import Status from './components/Status';
import { TemplateThreatStatement } from '../../customTypes';
import threatFieldData from '../../data/threatFieldData';

export interface MetricsProps {
  statement: TemplateThreatStatement;
  onClick: (token: string) => void;
}

const Metrics: FC<MetricsProps> = ({ statement, onClick }) => {
  return (<Container>
    <SpaceBetween direction='vertical' size='s'>
      <TextContent><h5>Inputs for mitigation</h5></TextContent>
      <Status label={threatFieldData.threat_source.displayTitle} onClick={() => onClick('threat_source')} completed={!!statement.threatSource}/>
      <Status label={threatFieldData.prerequisites.displayTitle} onClick={() => onClick('prerequisites')} completed={!!statement.prerequisites}/>
      <Status label={threatFieldData.threat_action.displayTitle} onClick={() => onClick('threat_action')} completed={!!statement.threatAction}/>
      <TextContent>
        <hr/><h5>Inputs for prioritization</h5></TextContent>
      <Status label={threatFieldData.threat_impact.displayTitle} onClick={() => onClick('threat_impact')} completed={!!statement.threatImpact}/>
      <Status label={threatFieldData.impacted_goal.displayTitle} onClick={() => onClick('impacted_goal')} completed={!!statement.impactedGoal && statement.impactedGoal.length > 0}/>
      <Status label={threatFieldData.impacted_assets.displayTitle} onClick={() => onClick('impacted_assets')} completed={!!statement.impactedAssets && statement.impactedAssets.length > 0}/>
    </SpaceBetween>
  </Container>);
};

export default Metrics;

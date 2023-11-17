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
import React, { FC } from 'react';
import ThreatPackComponent from '../../components/workspaces/ThreatPack';
import WorkspaceContextAggregator from '../../contexts/WorkspaceContextAggregator';

export interface ThreatPackProps {
  workspaceId?: string;
  threatPackId?: string;
}

const ThreatPack: FC<ThreatPackProps> = ({ workspaceId, threatPackId }) => {
  return (<WorkspaceContextAggregator
    requiredGlobalSetupContext
    workspaceId={workspaceId || null}
    composerMode='Full'
  >
    <ThreatPackComponent threatPackId={threatPackId || 'Sample'}/>
  </WorkspaceContextAggregator>);
};

export default ThreatPack;
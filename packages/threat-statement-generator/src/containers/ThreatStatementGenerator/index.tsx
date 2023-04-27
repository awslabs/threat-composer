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
import { FC } from 'react';
import ThreatStatementEditor from '../../components/threats/ThreatStatementEditor';
import ThreatStatementList from '../../components/threats/ThreatStatementList';
import AssumptionLinksContextProvider from '../../contexts/AssumptionLinksContext';
import AssumptionsContextProvider from '../../contexts/AssumptionsContext';
import MitigationLinksContextProvider from '../../contexts/MitigationLinksContext';
import MitigationsContextProvider from '../../contexts/MitigationsContext';
import ThreatsContextProvider from '../../contexts/ThreatsContext';
import { useThreatsContext } from '../../contexts/ThreatsContext/context';
import WorkspacesContextProvider from '../../contexts/WorkspacesContext';

import './index.css';
import '@cloudscape-design/global-styles/index.css';

const ThreatStatementGeneratorInner: FC = () => {
  const { view } = useThreatsContext();
  return view === 'list' ? <ThreatStatementList /> : <ThreatStatementEditor />;
};

/**
 * Main component for Threat Statement Generator.
 * This component can be imported and used in other react app.
 */
const ThreatStatementGenerator: FC = () => {
  return (<div className='threat-statement-generator-main'>
    <WorkspacesContextProvider>
      {(workspaceId) => (
        <AssumptionsContextProvider workspaceId={workspaceId}>
          <AssumptionLinksContextProvider workspaceId={workspaceId}>
            <MitigationsContextProvider workspaceId={workspaceId}>
              <MitigationLinksContextProvider workspaceId={workspaceId}>
                <ThreatsContextProvider workspaceId={workspaceId || null}>
                  <ThreatStatementGeneratorInner />
                </ThreatsContextProvider>
              </MitigationLinksContextProvider>
            </MitigationsContextProvider>
          </AssumptionLinksContextProvider>
        </AssumptionsContextProvider>
      )}
    </WorkspacesContextProvider>
  </div>);
};

export default ThreatStatementGenerator;
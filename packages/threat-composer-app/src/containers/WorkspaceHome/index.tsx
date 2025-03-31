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
import { WorkspaceHome as WorkspaceHomeComponent, ThreatStatementListFilter } from '@aws/threat-composer';
import { MitigationListFilter } from '@aws/threat-composer-core';
import { ROUTE_APPLICATION_INFO, ROUTE_MITIGATION_LIST, ROUTE_THREAT_EDITOR, ROUTE_THREAT_LIST } from '../../config/routes';
import useNavigateView from '../../hooks/useNavigationView';

const WorkspaceHome = () => {
  const handleNavigateView = useNavigateView();
  return <WorkspaceHomeComponent
    onDefineWorkload={() => handleNavigateView(ROUTE_APPLICATION_INFO)}
    onThreatEditorView={(threatId: string, idToCopy?: string) => handleNavigateView(ROUTE_THREAT_EDITOR, threatId, undefined, idToCopy ? {
      idToCopy,
    } : undefined, {
      state: {
        idToCopy,
      },
    })}
    onThreatListView={(filter?: ThreatStatementListFilter) => handleNavigateView(ROUTE_THREAT_LIST, undefined, undefined, undefined, {
      state: filter ? {
        filter,
      } : undefined,
    })}
    onMitigationListView={(filter?: MitigationListFilter) => handleNavigateView(ROUTE_MITIGATION_LIST, undefined, undefined, undefined, {
      state: filter ? {
        filter,
      } : undefined,
    })}
  />;
};

export default WorkspaceHome;
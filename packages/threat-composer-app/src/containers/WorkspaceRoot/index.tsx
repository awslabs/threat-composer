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
import {
  DEFAULT_WORKSPACE_ID,
  WorkspaceContextAggregator,
  WorkspacesContext,
  WorkspaceExamplesContext,
} from '@aws/threat-composer';
import { ThreatStatementListFilter } from '@aws/threat-composer-core';
import { useCallback, FC } from 'react';
import { useNavigate, useParams, useSearchParams, Outlet } from 'react-router-dom';
import {
  ROUTE_THREAT_EDITOR_PATH,
  ROUTE_THREAT_LIST_PATH,
  ROUTE_WORKSPACE_HOME,
} from '../../config/routes';
import generateUrl from '../../utils/generateUrl';
import AppLayout from '../AppLayout';

const WorkspaceRoot: FC = () => {
  const { workspaceId = DEFAULT_WORKSPACE_ID } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const handleThreatListView = useCallback((filter?: ThreatStatementListFilter) => {
    navigate(generateUrl(ROUTE_THREAT_LIST_PATH, searchParams, workspaceId), {
      state: filter ? {
        filter,
      } : undefined,
    });
  }, [navigate, workspaceId, searchParams]);

  const handleThreatEditorView = useCallback((newThreatId: string, idToCopy?: string) => {
    navigate(generateUrl(ROUTE_THREAT_EDITOR_PATH, searchParams, workspaceId, newThreatId, undefined, idToCopy ? {
      idToCopy,
    } : undefined), {
      state: {
        idToCopy,
      },
    });
  }, [navigate, workspaceId, searchParams]);

  const handleWorkspaceChanged = useCallback((newWorkspaceId: string) => {
    const url = generateUrl(ROUTE_WORKSPACE_HOME, searchParams, newWorkspaceId);
    navigate(url);
  }, [navigate, workspaceId, searchParams]);

  return (
    <WorkspaceExamplesContext>
      <WorkspacesContext
        onWorkspaceChanged={handleWorkspaceChanged}
        workspaceName={workspaceId}
      >
        {(workspaceIdFromContext) => (<WorkspaceContextAggregator
          workspaceId={workspaceIdFromContext}
          requiredGlobalSetupContext={false}
          onThreatEditorView={handleThreatEditorView}
          onThreatListView={handleThreatListView}
        >
          <AppLayout>
            <Outlet />
          </AppLayout>
        </WorkspaceContextAggregator>)}
      </WorkspacesContext>
    </WorkspaceExamplesContext>);
};

export default WorkspaceRoot;
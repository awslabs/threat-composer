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
import { useContext, createContext } from 'react';
import { ViewNavigationEvent, Workspace } from '../../customTypes';
import { PLACEHOLDER_EXCHANGE_DATA_FOR_WORKSPACE } from '../../hooks/useExportImport';

export interface WorkspacesContextApi extends ViewNavigationEvent {
  workspaceList: Workspace[];
  setWorkspaceList: (workspace: Workspace[]) => void;
  currentWorkspace: Workspace | null;
  switchWorkspace: (workspaceId: string | null) => void;
  removeWorkspace: (id: string) => Promise<void>;
  addWorkspace: (workspaceName: string, storageType?: Workspace['storageType'], metadata?: Workspace['metadata']) => Promise<Workspace>;
  renameWorkspace: (id: string, newWorkspaceName: string) => Promise<void>;
}

const initialState: WorkspacesContextApi = {
  workspaceList: [],
  setWorkspaceList: () => { },
  currentWorkspace: null,
  switchWorkspace: () => { },
  addWorkspace: () => Promise.resolve(PLACEHOLDER_EXCHANGE_DATA_FOR_WORKSPACE),
  removeWorkspace: () => Promise.resolve(),
  renameWorkspace: () => Promise.resolve(),
};

export const WorkspacesContext = createContext<WorkspacesContextApi>(initialState);
export const useWorkspacesContext = () => useContext(WorkspacesContext);
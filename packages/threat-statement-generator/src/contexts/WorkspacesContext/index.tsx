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
import { FC, useCallback, ReactElement } from 'react';
import useLocalStorageState from 'use-local-storage-state';
import { v4 as uuidv4 } from 'uuid';
import { WorkspacesContext } from './context';
import { LOCAL_STORAGE_KEY_CURRENT_WORKSPACE, LOCAL_STORAGE_KEY_WORKSPACE_LIST } from '../../configs/localStorageKeys';
import { Workspace } from '../../customTypes';
import WorkspacesMigration from '../../migrations/WorkspacesMigration';

export interface WorkspacesContextProviderProps {
  children: (workspaceId: string | null) => ReactElement<{ workspaceId: string | null }>;
}

const WorkspacesContextProvider: FC<WorkspacesContextProviderProps> = ({ children }) => {
  const [currentWorkspace, setCurrentWorkspace] = useLocalStorageState<Workspace | null>(LOCAL_STORAGE_KEY_CURRENT_WORKSPACE, {
    defaultValue: null,
  });

  const [workspaceList, setWorkspaceList] = useLocalStorageState<Workspace[]>(LOCAL_STORAGE_KEY_WORKSPACE_LIST, {
    defaultValue: [],
  });

  const handleSwitchWorkspace = useCallback((workspace: Workspace | null) => {
    setCurrentWorkspace(workspace);
  }, []);

  const handleAddWorkspace = useCallback((workspaceName: string) => {
    const newWorkspace = {
      id: uuidv4(),
      name: workspaceName,
    };
    setWorkspaceList(prev => prev.find(p => p.name === workspaceName) ? [...prev] : [...prev, newWorkspace]);
    setCurrentWorkspace(newWorkspace);
  }, []);

  const handleRemoveWorkspace = useCallback((id: string) => {
    setWorkspaceList(prev => prev.filter(p => p.id !== id));
  }, []);

  const handleRenameWorkspace = useCallback((id: string, newWorkspaceName: string) => {
    setWorkspaceList(prev => {
      const index = prev.findIndex(w => w.id === id);
      const newList = [...prev.slice(0, index - 1), {
        id,
        name: newWorkspaceName,
      }, ...prev.slice(index + 1)];
      return newList;
    });

    setCurrentWorkspace({
      id,
      name: newWorkspaceName,
    });
  }, []);

  return (<WorkspacesContext.Provider value={{
    workspaceList,
    setWorkspaceList,
    currentWorkspace,
    switchWorkspace: handleSwitchWorkspace,
    addWorkspace: handleAddWorkspace,
    removeWorkspace: handleRemoveWorkspace,
    renameWorkspace: handleRenameWorkspace,
  }}>
    <WorkspacesMigration>
      {children(currentWorkspace?.id || null)}
    </WorkspacesMigration>
  </WorkspacesContext.Provider>);
};

export default WorkspacesContextProvider;

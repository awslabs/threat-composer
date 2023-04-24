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
import { FC, useContext, createContext, useCallback, ReactElement, useEffect } from 'react';
import useLocalStorageState from 'use-local-storage-state';
import { v4 as uuidv4 } from 'uuid';
import { Workspace } from '../../customTypes';

export const LOCAL_STORAGE_KEY_CURRENT_WORKSPACE = 'ThreatStatementGenerator.currentWorkspace';
export const LOCAL_STORAGE_KEY_WORKSPACE_LIST = 'ThreatStatementGenerator.workspaceList';
export const LOCAL_STORAGE_KEY_WORKSPACE_LIST_MIGRATION = 'ThreatStatementGenerator.workspaceListMigration';

export interface WorkspacesContextApi {
  workspaceList: Workspace[];
  currentWorkspace: Workspace | null;
  removeWorkspace: (id: string) => void;
  addWorkspace: (workspaceName: string) => void;
  renameWorkspace: (id: string, newWorkspaceName: string) => void;
  switchWorkspace: (workspace: Workspace | null) => void;
}

const initialState: WorkspacesContextApi = {
  workspaceList: [],
  currentWorkspace: null,
  switchWorkspace: () => { },
  addWorkspace: () => { },
  removeWorkspace: () => { },
  renameWorkspace: () => { },
};

const WorkspacesContext = createContext<WorkspacesContextApi>(initialState);

export interface WorkspacesContextProviderProps {
  children: (workspace: Workspace | null) => ReactElement<{ workspace: Workspace | null }>;
}

const WorkspacesContextProvider: FC<WorkspacesContextProviderProps> = ({ children }) => {
  const [migrated, setMigrated] = useLocalStorageState<boolean>(LOCAL_STORAGE_KEY_WORKSPACE_LIST_MIGRATION, {
    defaultValue: false,
  });

  const [currentWorkspace, setCurrentWorkspace] = useLocalStorageState<Workspace | null>(LOCAL_STORAGE_KEY_CURRENT_WORKSPACE, {
    defaultValue: null,
  });

  const [workspaceList, setWorkspacesList] = useLocalStorageState<Workspace[]>(LOCAL_STORAGE_KEY_WORKSPACE_LIST, {
    defaultValue: [],
  });

  // Temporarily tracking Workspace data structure migration
  useEffect(() => {
    if (!migrated) {
      if (workspaceList.length > 0 && typeof workspaceList[0] === 'string') {
        setWorkspacesList(prev => {
          // @ts-ignore
          const newList = prev.map((p: string) => ({
            id: uuidv4(),
            name: p,
          }));
          // @ts-ignore
          currentWorkspace && typeof currentWorkspace === 'string' && setCurrentWorkspace(prevWs => newList.find(x => x.name === prevWs));
          return newList;
        });

        setMigrated(true);
      }
    }
  }, [workspaceList, migrated]);

  const handleSwitchWorkspace = useCallback((workspace: Workspace | null) => {
    setCurrentWorkspace(workspace);
  }, []);

  const handleAddWorkspace = useCallback((workspaceName: string) => {
    const newWorkspace = {
      id: uuidv4(),
      name: workspaceName,
    };
    setWorkspacesList(prev => prev.find(p => p.name === workspaceName) ? [...prev] : [...prev, newWorkspace]);
    setCurrentWorkspace(newWorkspace);
  }, []);

  const handleRemoveWorkspace = useCallback((id: string) => {
    setWorkspacesList(prev => prev.filter(p => p.id !== id));
  }, []);

  const handleRenameWorkspace = useCallback((id: string, newWorkspaceName: string) => {
    setWorkspacesList(prev => {
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
    currentWorkspace,
    switchWorkspace: handleSwitchWorkspace,
    addWorkspace: handleAddWorkspace,
    removeWorkspace: handleRemoveWorkspace,
    renameWorkspace: handleRenameWorkspace,
  }}>
    {children(currentWorkspace)}
  </WorkspacesContext.Provider>);
};

export const useWorkspacesContext = () => useContext(WorkspacesContext);
export default WorkspacesContextProvider;

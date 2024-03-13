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
import { FC, useCallback, ReactElement, useEffect } from 'react';
import useLocalStorageState from 'use-local-storage-state';
import { v4 as uuidv4 } from 'uuid';
import { WorkspacesContext, useWorkspacesContext } from './context';
import { DEFAULT_WORKSPACE_ID } from '../../configs/constants';
import { LOCAL_STORAGE_KEY_CURRENT_WORKSPACE, LOCAL_STORAGE_KEY_WORKSPACE_LIST } from '../../configs/localStorageKeys';
import { ViewNavigationEvent, Workspace } from '../../customTypes';
import WorkspacesMigration from '../../migrations/WorkspacesMigration';
import isWorkspaceExample from '../../utils/isWorkspaceExample';
import { useWorkspaceExamplesContext } from '../WorkspaceExamplesContext';

export interface WorkspacesContextProviderProps extends ViewNavigationEvent {
  workspaceId?: string;
  onWorkspaceChanged?: (workspaceId: string) => void;
  children: (workspace: string | null) => ReactElement<{ workspaceId: string | null }>;
}

const WorkspacesContextProvider: FC<WorkspacesContextProviderProps> = ({
  children,
  workspaceId,
  onWorkspaceChanged,
  ...props
}) => {
  const [currentWorkspace, setCurrentWorkspace] = useLocalStorageState<Workspace | null>(LOCAL_STORAGE_KEY_CURRENT_WORKSPACE, {
    defaultValue: null,
  });

  const [workspaceList, setWorkspaceList] = useLocalStorageState<Workspace[]>(LOCAL_STORAGE_KEY_WORKSPACE_LIST, {
    defaultValue: [],
  });

  const { workspaceExamples } = useWorkspaceExamplesContext();

  useEffect(() => {
    if (workspaceId) {
      if (workspaceId === DEFAULT_WORKSPACE_ID && currentWorkspace !== null) {
        setCurrentWorkspace(null);
      } else if (workspaceId !== currentWorkspace?.id) {
        const foundWorkspace = workspaceList.find(x => x.id === workspaceId);
        if (foundWorkspace) {
          setCurrentWorkspace(foundWorkspace);
        } else {
          setCurrentWorkspace(null);
        }
      }
    }
  }, [workspaceId, workspaceList, currentWorkspace]);

  const getWorkspace = useCallback((toBeSwitchedWorkspaceId: string | null) => {
    const isExample = isWorkspaceExample(toBeSwitchedWorkspaceId);
    if (isExample) {
      return workspaceExamples.find(w => w.id === toBeSwitchedWorkspaceId) || null;
    }

    if (toBeSwitchedWorkspaceId && toBeSwitchedWorkspaceId !== DEFAULT_WORKSPACE_ID) {
      return workspaceList.find(w => w.id === toBeSwitchedWorkspaceId) || null;
    }

    return null;
  }, [
    workspaceExamples,
    workspaceList,
  ]);

  const handleSwitchWorkspace = useCallback((toBeSwitchedWorkspaceId: string | null) => {
    const workspace = getWorkspace(toBeSwitchedWorkspaceId);
    setCurrentWorkspace(workspace);
    onWorkspaceChanged?.(workspace?.id || DEFAULT_WORKSPACE_ID);
  }, [onWorkspaceChanged, getWorkspace]);

  const handleAddWorkspace = useCallback(async (workspaceName: string,
    storageType?: Workspace['storageType'],
    metadata?: Workspace['metadata']) => {
    const newWorkspace = {
      id: uuidv4(),
      name: workspaceName,
      storageType,
      metadata,
    };
    setWorkspaceList(prev => [...prev, newWorkspace]);
    setCurrentWorkspace(newWorkspace);
    onWorkspaceChanged?.(newWorkspace.id);
    return newWorkspace;
  }, [onWorkspaceChanged]);

  const handleRemoveWorkspace = useCallback(async (id: string) => {
    setWorkspaceList(prev => prev.filter(p => p.id !== id));
  }, []);

  const handleRenameWorkspace = useCallback(async (id: string, newWorkspaceName: string) => {
    setWorkspaceList(prev => {
      const index = prev.findIndex(w => w.id === id);
      const newList = [... index < 1 ? [] : prev.slice(0, index), {
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
    ...props,
  }}>
    <WorkspacesMigration>
      {children(currentWorkspace?.id || null)}
    </WorkspacesMigration>
  </WorkspacesContext.Provider>);
};

export default WorkspacesContextProvider;

export {
  useWorkspacesContext,
};

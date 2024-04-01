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
import { FC, useEffect } from 'react';
import useLocalStorageState from 'use-local-storage-state';
import { DEFAULT_WORKSPACE_ID } from '../../../../configs/constants';
import { LOCAL_STORAGE_KEY_CURRENT_WORKSPACE, LOCAL_STORAGE_KEY_WORKSPACE_LIST } from '../../../../configs/localStorageKeys';
import { Workspace } from '../../../../customTypes';
import WorkspacesMigration from '../../../../migrations/WorkspacesMigration';
import { WorkspacesContext } from '../../context';
import { WorkspacesContextProviderProps } from '../../types';
import useWorkspaces from '../../useWorkspaces';

const WorkspacesLocalStorageContextProvider: FC<WorkspacesContextProviderProps> = ({
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

  const {
    handleSwitchWorkspace,
    handleAddWorkspace,
    handleRemoveWorkspace,
    handleRenameWorkspace,
  } = useWorkspaces(workspaceList, setWorkspaceList, currentWorkspace, setCurrentWorkspace, onWorkspaceChanged);

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

export default WorkspacesLocalStorageContextProvider;

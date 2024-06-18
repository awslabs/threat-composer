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
import { FC, useMemo } from 'react';
import useLocalStorageState from 'use-local-storage-state';
import { DEFAULT_WORKSPACE_ID } from '../../../../configs/constants';
import { LOCAL_STORAGE_KEY_CURRENT_WORKSPACE, LOCAL_STORAGE_KEY_WORKSPACE_LIST } from '../../../../configs/localStorageKeys';
import { Workspace } from '../../../../customTypes';
import WorkspacesMigration from '../../../../migrations/WorkspacesMigration';
import { useWorkspaceExamplesContext } from '../../../WorkspaceExamplesContext';
import { WorkspacesContext } from '../../context';
import { WorkspacesContextProviderProps } from '../../types';
import useWorkspaces from '../../useWorkspaces';

const WorkspacesLocalStorageContextProvider: FC<WorkspacesContextProviderProps> = ({
  children,
  workspaceName,
  onWorkspaceChanged,
  ...props
}) => {
  const [workspaceList, setWorkspaceList] = useLocalStorageState<Workspace[]>(LOCAL_STORAGE_KEY_WORKSPACE_LIST, {
    defaultValue: [],
  });

  const [lastWorkspace, setCurrentWorkspace] = useLocalStorageState<Workspace | null>(LOCAL_STORAGE_KEY_CURRENT_WORKSPACE, {
    defaultValue: null,
  });

  const { workspaceExamples } = useWorkspaceExamplesContext();

  const currentWorkspace = useMemo(() => {
    if (workspaceName) { // If the workspaceName is specified by outside scope (e.g. Url), return the workspace specified by the id
      if (workspaceName === DEFAULT_WORKSPACE_ID) {
        return null;
      }

      const foundWorkspace = workspaceList.find(x => x.name === workspaceName);
      if (foundWorkspace) {
        return foundWorkspace;
      }

      const foundWorkspaceExample = workspaceExamples.find(x => x.name === workspaceName);
      if (foundWorkspaceExample) {
        return foundWorkspaceExample;
      }
    }

    return lastWorkspace;
  }, [lastWorkspace, workspaceName, workspaceExamples, workspaceList]);

  const {
    handleSwitchWorkspace,
    handleAddWorkspace,
    handleRemoveWorkspace,
    handleRenameWorkspace,
  } = useWorkspaces(workspaceList, setWorkspaceList, currentWorkspace, setCurrentWorkspace, onWorkspaceChanged);

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

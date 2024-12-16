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
import { FC, useState } from 'react';
import { Workspace } from '../../../../customTypes';
import { useWorkspaceExamplesContext } from '../../../WorkspaceExamplesContext';
import { WorkspacesContext } from '../../context';
import { WorkspacesContextProviderProps } from '../../types';
import useCurrentWorkspace from '../../useCurrentWorkspace';
import useWorkspaces from '../../useWorkspaces';

const WorkspacesLocalStateContextProvider: FC<WorkspacesContextProviderProps> = ({
  children,
  workspaceName,
  onWorkspaceChanged,
  ...props
}) => {
  const { workspaceExamples } = useWorkspaceExamplesContext();

  const [workspaceList, setWorkspaceList] = useState<Workspace[]>([]);

  const [lastWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);

  const currentWorkspace = useCurrentWorkspace(lastWorkspace, workspaceName, workspaceList, workspaceExamples, onWorkspaceChanged);

  const {
    handleSwitchWorkspace,
    handleAddWorkspace,
    handleRemoveWorkspace,
    handleRenameWorkspace,
    handleChangeLanguage,
  } = useWorkspaces(workspaceList, setWorkspaceList, currentWorkspace, setCurrentWorkspace, onWorkspaceChanged);

  return (<WorkspacesContext.Provider value={{
    workspaceList,
    setWorkspaceList,
    currentWorkspace,
    switchWorkspace: handleSwitchWorkspace,
    addWorkspace: handleAddWorkspace,
    removeWorkspace: handleRemoveWorkspace,
    renameWorkspace: handleRenameWorkspace,
    changeLanguage: handleChangeLanguage,
    ...props,
  }}>
    {children(currentWorkspace?.id || null)}
  </WorkspacesContext.Provider>);
};

export default WorkspacesLocalStateContextProvider;

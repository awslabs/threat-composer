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
import { useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { DEFAULT_WORKSPACE_ID } from '../../configs/constants';
import { EVENT_WORKSPACE_CHANGED } from '../../configs/events';
import { Workspace } from '../../customTypes';
import isWorkspaceExample from '../../utils/isWorkspaceExample';
import { useWorkspaceExamplesContext } from '../WorkspaceExamplesContext';

const useWorkspaces = (
  workspaceList: Workspace[],
  setWorkspaceList: React.Dispatch<React.SetStateAction<Workspace[]>>,
  currentWorkspace: Workspace | null,
  setCurrentWorkspace: React.Dispatch<React.SetStateAction<Workspace | null>>,
  onWorkspaceChanged?: (workspaceName: string) => void,
) => {
  const { workspaceExamples } = useWorkspaceExamplesContext();

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
    onWorkspaceChanged?.(workspace?.name || DEFAULT_WORKSPACE_ID);
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
    onWorkspaceChanged?.(newWorkspace.name);
    return newWorkspace;
  }, [onWorkspaceChanged]);

  const handleRemoveWorkspace = useCallback(async (id: string) => {
    setWorkspaceList(prev => prev.filter(p => p.id !== id));
  }, []);

  const handleRenameWorkspace = useCallback(async (id: string, newWorkspaceName: string) => {
    setWorkspaceList(prev => {
      const index = prev.findIndex(w => w.id === id);
      const newList = [...index < 1 ? [] : prev.slice(0, index), {
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

  useEffect(() => {
    window.threatcomposer?.dispatchEvent?.(
      new CustomEvent(EVENT_WORKSPACE_CHANGED, {
        detail: {
          workspace: currentWorkspace,
        },
      }));
  }, [currentWorkspace]);

  return {
    handleSwitchWorkspace,
    handleAddWorkspace,
    handleRemoveWorkspace,
    handleRenameWorkspace,
  };
};

export default useWorkspaces;
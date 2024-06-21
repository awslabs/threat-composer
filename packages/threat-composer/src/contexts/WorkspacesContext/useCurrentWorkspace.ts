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
import { useEffect, useMemo } from 'react';
import { DEFAULT_WORKSPACE_ID } from '../../configs';
import { Workspace } from '../../customTypes';

const useCurrentWorkspace = (
  lastWorkspace: Workspace | null,
  workspaceName: string | undefined,
  workspaceList: Workspace[],
  workspaceExamples: Workspace[],
  onWorkspaceChanged?: (workspaceId: string) => void) => {
  const [currentWorkspace, navigateToWorkspace] = useMemo(() => {
    if (workspaceName) { // If the workspaceName is specified by outside scope (e.g. Url), return the workspace specified by the id
      if (workspaceName === DEFAULT_WORKSPACE_ID) {
        return [null, null];
      }

      const foundWorkspace = workspaceList.find(x => x.name === workspaceName);
      if (foundWorkspace) {
        return [foundWorkspace, null];
      }

      const foundWorkspaceExample = workspaceExamples.find(x => x.name === workspaceName);
      if (foundWorkspaceExample) {
        return [foundWorkspaceExample, null];
      }

      // Unable to located the workspace from workspace name, redirect to last visited workspace or default workspace.
      return [null, lastWorkspace || {
        name: DEFAULT_WORKSPACE_ID,
      }];
    }

    return [lastWorkspace, null];
  }, [lastWorkspace, workspaceName, workspaceExamples, workspaceList]);

  useEffect(() => {
    if (navigateToWorkspace) {
      onWorkspaceChanged?.(navigateToWorkspace?.name || DEFAULT_WORKSPACE_ID);
    }
  }, [navigateToWorkspace, onWorkspaceChanged]);

  return currentWorkspace;
};

export default useCurrentWorkspace;
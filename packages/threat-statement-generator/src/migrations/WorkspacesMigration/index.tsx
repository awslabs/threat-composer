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
import { FC, useEffect, ReactNode } from 'react';
import useLocalStorageState from 'use-local-storage-state';
import { v4 as uuidv4 } from 'uuid';
import { LOCAL_STORAGE_KEY_WORKSPACE_LIST_MIGRATION } from '../../configs/localStorageKeys';
import { useWorkspacesContext } from '../../contexts/WorkspacesContext/context';

export interface WorkspacesMigrationProps {
  children: ReactNode;
}

/**
 * Migrates the old workspaces list to the new format
 */
const WorkspacesMigration: FC<WorkspacesMigrationProps> = ({ children }) => {
  const { workspaceList, setWorkspaceList } = useWorkspacesContext();

  const [migrated, setMigrated] = useLocalStorageState<boolean>(LOCAL_STORAGE_KEY_WORKSPACE_LIST_MIGRATION, {
    defaultValue: false,
  });

  // Temporarily tracking Workspace data structure migration
  useEffect(() => {
    if (!migrated) {
      if (workspaceList.length > 0 && typeof workspaceList[0] === 'string') {
        // @ts-ignore
        setWorkspaceList((prev: any) => {
          // @ts-ignore
          const newList = prev.map((p: string) => ({
            id: uuidv4(),
            name: p,
          }));
          // @ts-ignore
          currentWorkspace && typeof currentWorkspace === 'string' && setCurrentWorkspace(prevWs => newList.find(x => x.name === prevWs));
          return newList;
        });
      }

      setMigrated(true);
    }
  }, [workspaceList, migrated]);

  return migrated && children ? <>{children}</> : null;
};

export default WorkspacesMigration;
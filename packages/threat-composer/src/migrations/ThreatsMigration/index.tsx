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
import { ReactNode, FC, useEffect } from 'react';
import useLocalStorageState from 'use-local-storage-state';
import { v4 as uuidv4 } from 'uuid';
import { LOCAL_STORAGE_KEY_THREATS_LIST_MIGRATION } from '../../configs/localStorageKeys';
import { useThreatsContext } from '../../contexts/ThreatsContext/context';

export interface WorkspacesMigrationProps {
  children: ReactNode;
}

/**
 * Migrates the old workspaces list to the new format
 */
const ThreatsMigration: FC<WorkspacesMigrationProps> = ({ children }) => {
  const { statementList, setStatementList, editingStatement, setEditingStatement } = useThreatsContext();

  const [migrated, setMigrated] = useLocalStorageState<boolean>(LOCAL_STORAGE_KEY_THREATS_LIST_MIGRATION, {
    defaultValue: false,
  });

  // Temporarily tracking Workspace data structure migration
  useEffect(() => {
    if (!migrated) {
      // @ts-ignore
      if (statementList.length > 0 && !isNaN(statementList[0].id)) {
        // @ts-ignore
        setStatementList((prev: any) => {
          // @ts-ignore
          const newList = prev.map((p: any) => ({
            ...p,
            numericId: p.id,
            id: uuidv4(),
          }));
          // @ts-ignore
          editingStatement && !isNaN(editingStatement.id) && setEditingStatement(prevT => newList.find(x => x.numericId === prevT.id));
          return newList;
        });
      }

      setMigrated(true);
    }
  }, [statementList, migrated]);

  return migrated && children ? <>{children}</> : null;
};

export default ThreatsMigration;
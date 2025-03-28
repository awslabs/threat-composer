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
import { STORAGE_LOCAL_STATE, STORAGE_LOCAL_STORAGE } from '@aws/threat-composer-core';
import { useMemo } from 'react';
import { APP_MODE_IDE_EXTENSION } from '../../configs';
import { useGlobalSetupContext } from '../../contexts';
import { useWorkspaceExamplesContext } from '../../contexts/WorkspaceExamplesContext';
import { useWorkspacesContext } from '../../contexts/WorkspacesContext';
import { DataExchangeFormat } from '../../customTypes';
import isWorkspaceExample from '../../utils/isWorkspaceExample';

type StorageType = typeof STORAGE_LOCAL_STATE | typeof STORAGE_LOCAL_STORAGE;

const useWorkspaceStorage = (workspaceId: string | null): {
  storageType: StorageType;
  value?: DataExchangeFormat;
} => {
  const { workspaceList } = useWorkspacesContext();
  const { getWorkspaceExample } = useWorkspaceExamplesContext();
  const { appMode } = useGlobalSetupContext();

  return useMemo(() => {
    if (appMode === APP_MODE_IDE_EXTENSION) {
      return {
        storageType: STORAGE_LOCAL_STATE,
      };
    }

    if (workspaceId && isWorkspaceExample(workspaceId)) {
      return {
        storageType: STORAGE_LOCAL_STATE,
        value: getWorkspaceExample(workspaceId)?.value,
      };
    }

    if (workspaceId) {
      const workspace = workspaceList.find(x => x.id === workspaceId);
      if (workspace && workspace.storageType === STORAGE_LOCAL_STATE) {
        return {
          storageType: STORAGE_LOCAL_STATE,
          value: undefined,
        };
      }
    }

    return {
      storageType: STORAGE_LOCAL_STORAGE,
      value: undefined,
    };
  }, [workspaceId, workspaceList]);
};

export default useWorkspaceStorage;

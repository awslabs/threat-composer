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
import { FC, PropsWithChildren, useCallback } from 'react';
import useLocalStorageState from 'use-local-storage-state';
import { ArchitectureInfoContext, useArchitectureInfoContext } from './context';
import { LOCAL_STORAGE_KEY_ARCHIECTURE_INFO } from '../../configs/localStorageKeys';
import { ArchitectureInfo } from '../../customTypes';
import removeLocalStorageKey from '../../utils/removeLocalStorageKey';

export interface ApplicationContextProviderProps {
  workspaceId: string | null;
}

const getLocalStorageKey = (workspaceId: string | null) => {
  if (workspaceId) {
    return `${LOCAL_STORAGE_KEY_ARCHIECTURE_INFO}_${workspaceId}`;
  }

  return LOCAL_STORAGE_KEY_ARCHIECTURE_INFO;
};

const DEFAULT_VALUE = {
  description: '',
};

const ApplicationContextProvider: FC<PropsWithChildren<ApplicationContextProviderProps>> = ({
  children,
  workspaceId: currentWorkspaceId,
}) => {
  const [architectureInfo, setArchitectureInfo, { removeItem }] = useLocalStorageState<ArchitectureInfo>(getLocalStorageKey(currentWorkspaceId), {
    defaultValue: DEFAULT_VALUE,
  });

  const handleRemoveArchitectureInfo = useCallback(async () => {
    removeItem();
  }, [removeItem]);

  const handleDeleteWorkspace = useCallback(async (workspaceId: string) => {
    window.setTimeout(() => {
      // to delete after the workspace is switched. Otherwise the default value is set again.
      removeLocalStorageKey(getLocalStorageKey(workspaceId));
    }, 1000);
  }, []);

  return (<ArchitectureInfoContext.Provider value={{
    architectureInfo,
    setArchitectureInfo,
    removeArchitectureInfo: handleRemoveArchitectureInfo,
    onDeleteWorkspace: handleDeleteWorkspace,
  }}>
    {children}
  </ArchitectureInfoContext.Provider>);
};

export default ApplicationContextProvider;

export {
  useArchitectureInfoContext,
};

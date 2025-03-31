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
import { ApplicationInfo } from '@aws/threat-composer-core';
import { FC, PropsWithChildren, useCallback } from 'react';
import useLocalStorageState from 'use-local-storage-state';
import { LOCAL_STORAGE_KEY_APPLICATION_INFO } from '../../../../configs/localStorageKeys';
import removeLocalStorageKey from '../../../../utils/removeLocalStorageKey';
import { INFO_DEFAULT_VALUE } from '../../../constants';
import { ApplicationInfoContext } from '../../context';
import { ApplicationContextProviderProps } from '../../types';

export const getLocalStorageKey = (workspaceId: string | null) => {
  if (workspaceId) {
    return `${LOCAL_STORAGE_KEY_APPLICATION_INFO}_${workspaceId}`;
  }

  return LOCAL_STORAGE_KEY_APPLICATION_INFO;
};

const ApplicationLocalStorageContextProvider: FC<PropsWithChildren<ApplicationContextProviderProps>> = ({
  children,
  workspaceId: currentWorkspaceId,
}) => {
  const [applicationInfo, setApplicationInfo, { removeItem }] = useLocalStorageState<ApplicationInfo>(getLocalStorageKey(currentWorkspaceId), {
    defaultValue: INFO_DEFAULT_VALUE,
  });

  const handleRemoveApplicationInfo = useCallback(async () => {
    removeItem();
  }, [removeItem]);

  const handleDeleteWorkspace = useCallback(async (workspaceId: string) => {
    window.setTimeout(() => {
      // to delete after the workspace is switched. Otherwise the default value is set again.
      removeLocalStorageKey(getLocalStorageKey(workspaceId));
    }, 1000);
  }, []);

  return (<ApplicationInfoContext.Provider value={{
    applicationInfo,
    setApplicationInfo,
    removeApplicationInfo: handleRemoveApplicationInfo,
    onDeleteWorkspace: handleDeleteWorkspace,
  }}>
    {children}
  </ApplicationInfoContext.Provider>);
};

export default ApplicationLocalStorageContextProvider;


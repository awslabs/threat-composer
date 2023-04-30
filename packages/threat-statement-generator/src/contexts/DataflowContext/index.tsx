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
import { FC, PropsWithChildren } from 'react';
import useLocalStorageState from 'use-local-storage-state';
import { DataflowInfoContext } from './context';
import { LOCAL_STORAGE_KEY_DATAFLOW_INFO } from '../../configs/localStorageKeys';
import { DataflowInfo } from '../../customTypes';

export interface ApplicationContextProviderProps {
  workspaceId: string | null;
}

const getLocalStorageKey = (workspaceId: string | null) => {
  if (workspaceId) {
    return `${LOCAL_STORAGE_KEY_DATAFLOW_INFO}_${workspaceId}`;
  }

  return LOCAL_STORAGE_KEY_DATAFLOW_INFO;
};

const ApplicationContextProvider: FC<PropsWithChildren<ApplicationContextProviderProps>> = ({
  children,
  workspaceId: currentWorkspaceId,
}) => {
  const [dataflowInfo, setDataflowInfo] = useLocalStorageState<DataflowInfo>(getLocalStorageKey(currentWorkspaceId), {
    defaultValue: {
      description: '',
    },
  });

  return (<DataflowInfoContext.Provider value={{
    dataflowInfo,
    setDataflowInfo,
  }}>
    {children}
  </DataflowInfoContext.Provider>);
};

export default ApplicationContextProvider;

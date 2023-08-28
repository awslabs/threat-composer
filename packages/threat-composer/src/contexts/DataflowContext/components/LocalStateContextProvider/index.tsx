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
import { FC, PropsWithChildren, useCallback, useState } from 'react';
import { DataflowInfo } from '../../../../customTypes';
import { INFO_DEFAULT_VALUE } from '../../../constants';
import { LocalStateContextProviderBaseProps } from '../../../types';
import { DataflowInfoContext } from '../../context';
import { DataflowContextProviderProps } from '../../types';

const ApplicationLocalStateContextProvider: FC<PropsWithChildren<
DataflowContextProviderProps & LocalStateContextProviderBaseProps<DataflowInfo>>> = ({
  children,
  initialValue,
}) => {
  const [dataflowInfo, setDataflowInfo] = useState<DataflowInfo>(initialValue || INFO_DEFAULT_VALUE);

  const handleRemoveDataflowInfo = useCallback(async () => {
    setDataflowInfo(INFO_DEFAULT_VALUE);
  }, []);

  const handleDeleteWorkspace = useCallback(async (_workspaceId: string) => {
    setDataflowInfo(INFO_DEFAULT_VALUE);
  }, []);

  return (<DataflowInfoContext.Provider value={{
    dataflowInfo,
    setDataflowInfo,
    removeDataflowInfo: handleRemoveDataflowInfo,
    onDeleteWorkspace: handleDeleteWorkspace,
  }}>
    {children}
  </DataflowInfoContext.Provider>);
};

export default ApplicationLocalStateContextProvider;


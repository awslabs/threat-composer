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
import { ArchitectureInfo } from '@aws/threat-composer-core';
import { FC, PropsWithChildren, useCallback, useState } from 'react';
import { INFO_DEFAULT_VALUE } from '../../../constants';
import { LocalStateContextProviderBaseProps } from '../../../types';
import { ArchitectureInfoContext } from '../../context';
import { ArchitectureContextProviderProps } from '../../types';

const ArchitectureLocalStateContextProvider: FC<PropsWithChildren<
ArchitectureContextProviderProps & LocalStateContextProviderBaseProps<ArchitectureInfo>>> = ({
  children,
  initialValue,
}) => {
  const [architectureInfo, setArchitectureInfo] = useState<ArchitectureInfo>(initialValue || INFO_DEFAULT_VALUE);

  const handleRemoveArchitectureInfo = useCallback(async () => {
    setArchitectureInfo(INFO_DEFAULT_VALUE);
  }, []);

  const handleDeleteWorkspace = useCallback(async (_workspaceId: string) => {
    setArchitectureInfo(INFO_DEFAULT_VALUE);
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

export default ArchitectureLocalStateContextProvider;

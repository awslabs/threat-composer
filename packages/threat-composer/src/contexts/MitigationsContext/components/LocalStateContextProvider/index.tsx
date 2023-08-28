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
import { Mitigation } from '../../../../customTypes';
import { LocalStateContextProviderBaseProps } from '../../../types';
import { MitigationsContext } from '../../context';
import { MitigationsContextProviderProps } from '../../types';
import useMitigations from '../../useMitigations';

const MitigationsLocalStateContextProvider: FC<PropsWithChildren<
MitigationsContextProviderProps & LocalStateContextProviderBaseProps<Mitigation[]>>> = ({
  children,
  initialValue,
}) => {
  const [mitigationList, setMitigationList] = useState<Mitigation[]>(initialValue || []);

  const {
    handlRemoveMitigation,
    handleSaveMitigation,
  } = useMitigations(mitigationList, setMitigationList);

  const handleRemoveAllMitigations = useCallback(async () => {
    setMitigationList([]);
  }, []);

  const handleDeleteWorkspace = useCallback(async (_workspaceId: string) => {
    setMitigationList([]);
  }, []);

  return (<MitigationsContext.Provider value={{
    mitigationList,
    setMitigationList,
    removeMitigation: handlRemoveMitigation,
    saveMitigation: handleSaveMitigation,
    removeAllMitigations: handleRemoveAllMitigations,
    onDeleteWorkspace: handleDeleteWorkspace,
  }}>
    {children}
  </MitigationsContext.Provider>);
};

export default MitigationsLocalStateContextProvider;


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
import { Assumption } from '../../../../customTypes';
import { AssumptionsContext } from '../../context';
import { AssumptionsContextProviderProps } from '../../types';
import useAssumptions from '../../useAssumptions';

const AssumptionsLocalStateContextProvider: FC<PropsWithChildren<AssumptionsContextProviderProps>> = ({
  children,
}) => {
  const [assumptionList, setAssumptionList] = useState<Assumption[]>([]);

  const {
    handleSaveAssumption,
    handlRemoveAssumption,
  } = useAssumptions(assumptionList, setAssumptionList);

  const handleRemoveAllAssumptions = useCallback(async () => {
    setAssumptionList([]);
  }, []);

  const handleDeleteWorkspace = useCallback(async (_workspaceId: string) => {
    setAssumptionList([]);
  }, []);

  return (<AssumptionsContext.Provider value={{
    assumptionList,
    setAssumptionList,
    removeAssumption: handlRemoveAssumption,
    saveAssumption: handleSaveAssumption,
    removeAllAssumptions: handleRemoveAllAssumptions,
    onDeleteWorkspace: handleDeleteWorkspace,
  }}>
    {children}
  </AssumptionsContext.Provider>);
};

export default AssumptionsLocalStateContextProvider;

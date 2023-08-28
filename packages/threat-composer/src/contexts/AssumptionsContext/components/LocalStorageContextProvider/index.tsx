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
import { LOCAL_STORAGE_KEY_ASSUMPTION_LIST } from '../../../../configs/localStorageKeys';
import { Assumption } from '../../../../customTypes';
import removeLocalStorageKey from '../../../../utils/removeLocalStorageKey';
import { AssumptionsContext } from '../../context';
import { AssumptionsContextProviderProps } from '../../types';
import useAssumptions from '../../useAssumptions';

const getLocalStorageKey = (workspaceId: string | null) => {
  if (workspaceId) {
    return `${LOCAL_STORAGE_KEY_ASSUMPTION_LIST}_${workspaceId}`;
  }

  return LOCAL_STORAGE_KEY_ASSUMPTION_LIST;
};

const AssumptionsLocalStorageContextProvider: FC<PropsWithChildren<AssumptionsContextProviderProps>> = ({
  children,
  workspaceId: currentWorkspaceId,
}) => {
  const [assumptionList, setAssumptionList, { removeItem }] = useLocalStorageState<Assumption[]>(getLocalStorageKey(currentWorkspaceId), {
    defaultValue: [],
  });

  const {
    handleSaveAssumption,
    handlRemoveAssumption,
  } = useAssumptions(assumptionList, setAssumptionList);

  const handleRemoveAllAssumptions = useCallback(async () => {
    removeItem();
  }, [removeItem]);

  const handleDeleteWorkspace = useCallback(async (workspaceId: string) => {
    window.setTimeout(() => {
      // to delete after the workspace is switched. Otherwise the default value is set again.
      removeLocalStorageKey(getLocalStorageKey(workspaceId));
    }, 1000);
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

export default AssumptionsLocalStorageContextProvider;

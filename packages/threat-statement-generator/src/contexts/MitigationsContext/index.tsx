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
import React, { FC, PropsWithChildren, useCallback } from 'react';
import useLocalStorageState from 'use-local-storage-state';
import { v4 as uuidV4 } from 'uuid';
import { AssumptionsContext } from './context';
import { LOCAL_STORAGE_KEY_ASSUMPTION_LIST } from '../../configs/localStorageKeys';
import { Assumption } from '../../customTypes';

export interface AssumptionsContextProviderProps {
  workspaceId: string | null;
}

const getLocalStorageKey = (workspaceId: string | null) => {
  if (workspaceId) {
    return `${LOCAL_STORAGE_KEY_ASSUMPTION_LIST}_${workspaceId}`;
  }

  return LOCAL_STORAGE_KEY_ASSUMPTION_LIST;
};

const AssumptionsContextProvider: FC<PropsWithChildren<AssumptionsContextProviderProps>> = ({
  children,
  workspaceId: currentWorkspaceId,
}) => {
  const [assumptionList, setAssumptionList] = useLocalStorageState<Assumption[]>(getLocalStorageKey(currentWorkspaceId), {
    defaultValue: [],
  });

  const handleAddAssumption = useCallback((idToCopy?: string) => {
    if (idToCopy) {
      const copied = assumptionList.find(st => st.id === idToCopy);
      if (copied) {
        const { id: _id, numericId: _numericId, ...rest } = copied;
        const newAssumption = {
          ...rest,
          id: uuidV4(),
          numericId: -1,
        };

        return newAssumption;
      }
    }

    return {
      id: uuidV4(),
      numericId: -1,
    };
  }, [assumptionList]);

  const handlRemoveAssumption = useCallback((id: string) => {
    setAssumptionList((prevList) => prevList.filter(x => x.id !== id));
  }, [setAssumptionList]);


  const handleSaveAssumption = useCallback((assumption: Assumption) => {
    setAssumptionList((prevList) => {
      let numericId = assumption.numericId;

      if (numericId === -1) {
        const maxId = prevList.reduce((max: number, cur: Assumption) => {

          if (cur.numericId > max) {
            return cur.numericId;
          }

          return max;
        }, 0);
        numericId = maxId + 1;
      }

      let updated: Assumption = {
        ...assumption,
        numericId,
        displayOrder: numericId,
      };

      const foundIndex = prevList.findIndex(st => st.id === updated.id);
      if (foundIndex >= 0) {
        return [...prevList.slice(0, foundIndex), updated, ...prevList.slice(foundIndex + 1)];
      }

      return [...prevList, updated];
    });
  }, [setAssumptionList]);

  const handleRemoveAllAssumptions = useCallback(() => {
    setAssumptionList([]);
  }, []);

  return (<AssumptionsContext.Provider value={{
    assumptionList,
    setAssumptionList,
    addAssumption: handleAddAssumption,
    removeAssumption: handlRemoveAssumption,
    saveAssumption: handleSaveAssumption,
    removeAllAssumptions: handleRemoveAllAssumptions,
  }}>
    {children}
  </AssumptionsContext.Provider>);
};


export default AssumptionsContextProvider;

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
import { LOCAL_STORAGE_KEY_BRAINSTORM_DATA } from '../../../../configs/localStorageKeys';
import { BrainstormData } from '../../../../customTypes/brainstorm';
import removeLocalStorageKey from '../../../../utils/removeLocalStorageKey';
import { BrainstormContext } from '../../context';
import useBrainstorm, { initialState } from '../../useBrainstorm';

export interface BrainstormContextProviderProps {
  workspaceId: string | null;
}

export const getLocalStorageKey = (workspaceId: string | null) => {
  if (workspaceId) {
    return `${LOCAL_STORAGE_KEY_BRAINSTORM_DATA}_${workspaceId}`;
  }

  return LOCAL_STORAGE_KEY_BRAINSTORM_DATA;
};

const BrainstormLocalStorageContextProvider: FC<PropsWithChildren<BrainstormContextProviderProps>> = ({
  children,
  workspaceId: currentWorkspaceId,
}) => {
  const [brainstormData, setBrainstormData] = useLocalStorageState<BrainstormData>(
    getLocalStorageKey(currentWorkspaceId),
    {
      defaultValue: initialState,
    },
  );

  const {
    addItem,
    updateItem,
    removeItem: removeItemFromHook,
  } = useBrainstorm(brainstormData, setBrainstormData);

  const handleDeleteWorkspace = useCallback(async (workspaceId: string) => {
    window.setTimeout(() => {
      // to delete after the workspace is switched. Otherwise the default value is set again.
      removeLocalStorageKey(getLocalStorageKey(workspaceId));
    }, 1000);
  }, []);

  return (
    <BrainstormContext.Provider
      value={{
        brainstormData,
        setBrainstormData,
        addItem,
        updateItem,
        removeItem: removeItemFromHook,
        onDeleteWorkspace: handleDeleteWorkspace,
      }}
    >
      {children}
    </BrainstormContext.Provider>
  );
};

export default BrainstormLocalStorageContextProvider;

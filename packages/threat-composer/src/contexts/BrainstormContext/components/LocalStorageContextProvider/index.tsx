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
import useLocalStorageState from 'use-local-storage-state';
import { LOCAL_STORAGE_KEY_BRAINSTORM_DATA } from '../../../../configs/localStorageKeys';
import removeLocalStorageKey from '../../../../utils/removeLocalStorageKey';
import { BrainstormContext } from '../../context';
import { BrainstormContextProviderProps, BrainstormData } from '../../types';
import useBrainstorm, { convertToContextData, convertFromContextData, initialState } from '../../useBrainstorm';

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
  const [brainstormDataExternal, setBrainstormDataExternal] = useLocalStorageState<BrainstormData>(
    getLocalStorageKey(currentWorkspaceId),
    {
      defaultValue: convertFromContextData(initialState),
    },
  );

  // Convert external data to internal format for the context
  const [brainstormData, setBrainstormDataInternal] = useState(() =>
    convertToContextData(brainstormDataExternal),
  );

  // Update internal state when external data changes
  const setBrainstormDataWrapper = useCallback((newData: typeof brainstormData) => {
    setBrainstormDataInternal(newData);
    setBrainstormDataExternal(convertFromContextData(newData));
  }, [setBrainstormDataExternal]);

  // Use the custom hook for business logic
  const {
    addItem,
    updateItem,
    removeItem: removeItemFromHook,
    setBrainstormData,
  } = useBrainstorm(brainstormData, setBrainstormDataWrapper);

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
        addItem,
        updateItem,
        removeItem: removeItemFromHook,
        setBrainstormData,
        onDeleteWorkspace: handleDeleteWorkspace,
      }}
    >
      {children}
    </BrainstormContext.Provider>
  );
};

export default BrainstormLocalStorageContextProvider;

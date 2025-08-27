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
import { BrainstormData } from '../../../../customTypes/brainstorm';
import { LocalStateContextProviderBaseProps } from '../../../types';
import { BrainstormContext } from '../../context';
import useBrainstorm, { initialState } from '../../useBrainstorm';

export interface BrainstormContextProviderProps {
  workspaceId: string | null;
}

const BrainstormLocalStateContextProvider: FC<
PropsWithChildren<BrainstormContextProviderProps & LocalStateContextProviderBaseProps<BrainstormData>>> = ({
  children,
  initialValue,
}) => {
  const [brainstormData, setBrainstormData] = useState<BrainstormData>(
    initialValue || initialState,
  );

  // Use the custom hook for business logic
  const {
    addItem,
    updateItem,
    removeItem: removeItemFromHook,
    groupItems,
    ungroupItem,
    getGroupedItems,
    mergeGroups,
  } = useBrainstorm(brainstormData, setBrainstormData);

  const handleDeleteWorkspace = useCallback(async (_workspaceId: string) => {
    setBrainstormData(initialState);
  }, []);

  return (
    <BrainstormContext.Provider
      value={{
        brainstormData,
        setBrainstormData,
        addItem,
        updateItem,
        removeItem: removeItemFromHook,
        groupItems,
        ungroupItem,
        getGroupedItems,
        mergeGroups,
        onDeleteWorkspace: handleDeleteWorkspace,
      }}
    >
      {children}
    </BrainstormContext.Provider>
  );
};

export default BrainstormLocalStateContextProvider;

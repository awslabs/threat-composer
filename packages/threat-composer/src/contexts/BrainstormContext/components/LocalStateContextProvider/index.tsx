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
import { LocalStateContextProviderBaseProps } from '../../../types';
import { BrainstormContext } from '../../context';
import { BrainstormContextProviderProps, BrainstormData, BrainstormContextData } from '../../types';
import useBrainstorm, { convertToContextData, initialState } from '../../useBrainstorm';

const BrainstormLocalStateContextProvider: FC<
PropsWithChildren<BrainstormContextProviderProps & LocalStateContextProviderBaseProps<BrainstormData>>> = ({
  children,
  initialValue,
}) => {
  const [brainstormData, setBrainstormDataInternal] = useState<BrainstormContextData>(
    convertToContextData(initialValue),
  );

  // Use the custom hook for business logic
  const {
    addItem,
    updateItem,
    removeItem: removeItemFromHook,
    setBrainstormData,
  } = useBrainstorm(brainstormData, setBrainstormDataInternal);

  const handleDeleteWorkspace = useCallback(async (_workspaceId: string) => {
    setBrainstormDataInternal(initialState);
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

export default BrainstormLocalStateContextProvider;

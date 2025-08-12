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
import { BrainstormContextProviderProps, BrainstormData, BrainstormItem, BrainstormContextData } from '../../types';

const initialState: BrainstormContextData = {
  assumptions: [],
  threatSources: [],
  threatPrerequisites: [],
  threatActions: [],
  threatImpacts: [],
  assets: [],
  mitigations: [],
};

// Helper function to convert external BrainstormData to internal BrainstormContextData
const convertToContextData = (data: BrainstormData | undefined): BrainstormContextData => {
  if (!data) return initialState;

  return {
    assumptions: data.assumptions || [],
    threatSources: data.threatSources || [],
    threatPrerequisites: data.threatPrerequisites || [],
    threatActions: data.threatActions || [],
    threatImpacts: data.threatImpacts || [],
    assets: data.assets || [],
    mitigations: data.mitigations || [],
  };
};

const BrainstormLocalStateContextProvider: FC<
PropsWithChildren<BrainstormContextProviderProps & LocalStateContextProviderBaseProps<BrainstormData>>> = ({
  children,
  initialValue,
}) => {
  const [brainstormData, setBrainstormDataInternal] = useState<BrainstormContextData>(
    convertToContextData(initialValue),
  );

  const addItem = useCallback((type: keyof BrainstormContextData, content: string) => {
    setBrainstormDataInternal((prevData: BrainstormContextData) => ({
      ...prevData,
      [type]: [
        ...prevData[type],
        {
          id: crypto.randomUUID(),
          content,
          createdAt: new Date().toISOString(),
          createdBy: undefined, // Will be set by the application when known
        },
      ],
    }));
  }, []);

  const updateItem = useCallback((type: keyof BrainstormContextData, id: string, content: string) => {
    setBrainstormDataInternal((prevData: BrainstormContextData) => ({
      ...prevData,
      [type]: prevData[type].map((item: BrainstormItem) =>
        item.id === id ? { ...item, content } : item,
      ),
    }));
  }, []);

  const handleRemoveItem = useCallback((type: keyof BrainstormContextData, id: string) => {
    setBrainstormDataInternal((prevData: BrainstormContextData) => ({
      ...prevData,
      [type]: prevData[type].filter((item: BrainstormItem) => item.id !== id),
    }));
  }, []);

  const setBrainstormData = useCallback((data: BrainstormData) => {
    setBrainstormDataInternal(convertToContextData(data));
  }, []);

  const handleDeleteWorkspace = useCallback(async (_workspaceId: string) => {
    setBrainstormDataInternal(initialState);
  }, []);

  return (
    <BrainstormContext.Provider
      value={{
        brainstormData,
        addItem,
        updateItem,
        removeItem: handleRemoveItem,
        setBrainstormData,
        onDeleteWorkspace: handleDeleteWorkspace,
      }}
    >
      {children}
    </BrainstormContext.Provider>
  );
};

export default BrainstormLocalStateContextProvider;

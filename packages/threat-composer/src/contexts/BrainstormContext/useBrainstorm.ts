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
import { useCallback } from 'react';
import { BrainstormData, BrainstormItem, BrainstormContextData } from './types';

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
export const convertToContextData = (data: BrainstormData | undefined): BrainstormContextData => {
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

// Helper function to convert internal BrainstormContextData to external BrainstormData
export const convertFromContextData = (data: BrainstormContextData): BrainstormData => {
  return {
    assumptions: data.assumptions,
    threatSources: data.threatSources,
    threatPrerequisites: data.threatPrerequisites,
    threatActions: data.threatActions,
    threatImpacts: data.threatImpacts,
    assets: data.assets,
    mitigations: data.mitigations,
  };
};

const useBrainstorm = (
  brainstormData: BrainstormContextData,
  setBrainstormData: (data: BrainstormContextData) => void,
) => {
  const addItem = useCallback((type: keyof BrainstormContextData, content: string) => {
    setBrainstormData({
      ...brainstormData,
      [type]: [
        ...brainstormData[type],
        {
          id: crypto.randomUUID(),
          content,
          createdAt: new Date().toISOString(),
          createdBy: undefined, // Will be set by the application when known
        },
      ],
    });
  }, [brainstormData, setBrainstormData]);

  const updateItem = useCallback((type: keyof BrainstormContextData, id: string, content: string) => {
    setBrainstormData({
      ...brainstormData,
      [type]: brainstormData[type].map((item: BrainstormItem) =>
        item.id === id ? { ...item, content } : item,
      ),
    });
  }, [brainstormData, setBrainstormData]);

  const removeItem = useCallback((type: keyof BrainstormContextData, id: string) => {
    setBrainstormData({
      ...brainstormData,
      [type]: brainstormData[type].filter((item: BrainstormItem) => item.id !== id),
    });
  }, [brainstormData, setBrainstormData]);

  const setBrainstormDataFromExternal = useCallback((data: BrainstormData) => {
    setBrainstormData(convertToContextData(data));
  }, [setBrainstormData]);

  return {
    addItem,
    updateItem,
    removeItem,
    setBrainstormData: setBrainstormDataFromExternal,
  };
};

export default useBrainstorm;
export { initialState };

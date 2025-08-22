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
import { BrainstormData, BrainstormItem } from '../../customTypes/brainstorm';

const initialState: BrainstormData = {
  assumptions: [],
  threatSources: [],
  threatPrerequisites: [],
  threatActions: [],
  threatImpacts: [],
  assets: [],
  mitigations: [],
};

const useBrainstorm = (
  brainstormData: BrainstormData,
  setBrainstormData: (data: BrainstormData) => void,
) => {
  const addItem = useCallback((type: keyof BrainstormData, content: string) => {
    setBrainstormData({
      ...brainstormData,
      [type]: [
        ...(brainstormData[type] || []),
        {
          id: crypto.randomUUID(),
          content,
          createdAt: new Date().toISOString(),
          createdBy: undefined, // Will be set by the application when known
        },
      ],
    });
  }, [brainstormData, setBrainstormData]);

  const updateItem = useCallback((type: keyof BrainstormData, id: string, content: string) => {
    setBrainstormData({
      ...brainstormData,
      [type]: (brainstormData[type] || []).map((item: BrainstormItem) =>
        item.id === id ? { ...item, content } : item,
      ),
    });
  }, [brainstormData, setBrainstormData]);

  const removeItem = useCallback((type: keyof BrainstormData, id: string) => {
    setBrainstormData({
      ...brainstormData,
      [type]: (brainstormData[type] || []).filter((item: BrainstormItem) => item.id !== id),
    });
  }, [brainstormData, setBrainstormData]);

  return {
    addItem,
    updateItem,
    removeItem,
  };
};

export default useBrainstorm;
export { initialState };

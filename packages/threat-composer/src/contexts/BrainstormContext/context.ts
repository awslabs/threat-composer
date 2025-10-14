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
import { useContext, createContext } from 'react';
import { BrainstormData, BrainstormItem } from '../../customTypes/brainstorm';

export interface BrainstormContextApi {
  brainstormData: BrainstormData;
  setBrainstormData: (data: BrainstormData) => void;
  addItem: (type: keyof BrainstormData, content: string) => void;
  updateItem: (type: keyof BrainstormData, id: string, content: string) => void;
  removeItem: (type: keyof BrainstormData, id: string) => void;
  groupItems: (type: keyof BrainstormData, sourceId: string, targetId: string) => void;
  ungroupItem: (type: keyof BrainstormData, id: string) => void;
  getGroupedItems: (type: keyof BrainstormData, groupId: string) => BrainstormItem[];
  getDisplayItems: (type: keyof BrainstormData) => Array<{ item: BrainstormItem; groupedItems: BrainstormItem[] }>;
  mergeGroups: (type: keyof BrainstormData, sourceId: string, targetId: string) => void;
  onDeleteWorkspace: (workspaceId: string) => Promise<void>;
}

const initialState: BrainstormContextApi = {
  brainstormData: {
    assumptions: [],
    threatSources: [],
    threatPrerequisites: [],
    threatActions: [],
    threatImpacts: [],
    assets: [],
    mitigations: [],
  },
  setBrainstormData: () => {},
  addItem: () => {},
  updateItem: () => {},
  removeItem: () => {},
  groupItems: () => {},
  ungroupItem: () => {},
  getGroupedItems: () => [],
  getDisplayItems: () => [],
  mergeGroups: () => {},
  onDeleteWorkspace: () => Promise.resolve(),
};

export const BrainstormContext = createContext<BrainstormContextApi>(initialState);

export const useBrainstormContext = () => useContext(BrainstormContext);

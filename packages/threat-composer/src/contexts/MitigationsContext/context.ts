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
import { Mitigation } from '@aws/threat-composer-core';
import { useContext, createContext } from 'react';
import { DEFAULT_NEW_ENTITY_ID } from '../../configs';
export type View = 'list' | 'editor';

export interface MitigationsContextApi {
  mitigationList: Mitigation[];
  setMitigationList: (entity: Mitigation[]) => void;
  removeMitigation: (id: string) => void;
  saveMitigation: (entity: Mitigation) => Mitigation;
  removeAllMitigations: () => Promise<void>;
  onDeleteWorkspace: (workspaceId: string) => Promise<void>;
}

const initialState: MitigationsContextApi = {
  mitigationList: [],
  setMitigationList: () => { },
  removeMitigation: () => { },
  saveMitigation: () => ({
    id: DEFAULT_NEW_ENTITY_ID,
    numericId: -1,
    content: '',
  }),
  removeAllMitigations: () => Promise.resolve(),
  onDeleteWorkspace: () => Promise.resolve(),
};

export const MitigationsContext = createContext<MitigationsContextApi>(initialState);

export const useMitigationsContext = () => useContext(MitigationsContext);
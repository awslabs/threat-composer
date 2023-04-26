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
import { MitigationLink } from '../../customTypes';
export type View = 'list' | 'editor';

export interface MitigationLinksContextApi {
  mitigationLinkList: MitigationLink[];
  setMitigationLinkList: (list: MitigationLink[]) => void;
  removeMitigationLink: (mitigationId: string, linkedEntityId: string) => void;
  saveMitigationLink: (entity: MitigationLink) => void;
  removeMitigationLinks: () => void;
}

const initialState: MitigationLinksContextApi = {
  mitigationLinkList: [],
  setMitigationLinkList: () => { },
  removeMitigationLink: () => { },
  saveMitigationLink: () => { },
  removeMitigationLinks: () => { },
};

export const MitigationLinksContext = createContext<MitigationLinksContextApi>(initialState);

export const useAssumptionsContext = () => useContext(MitigationLinksContext);
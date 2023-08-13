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
export interface MitigationLinksContextApi {
  mitigationLinkList: MitigationLink[];
  setMitigationLinkList: (list: MitigationLink[]) => void;
  getLinkedMitigationLinks: (linkedEntityId: string) => MitigationLink[];
  getMitigtaionThreatLinks: (mitigationId: string) => MitigationLink[];
  removeMitigationLink: (mitigationId: string, linkedEntityId: string) => void;
  removeMitigationLinksByMitigationId: (mitigationId: string) => Promise<void>;
  removeMitigationLinksByLinkedEntityId: (linkedEntityId: string) => Promise<void>;
  removeMitigationLinks: (entity: MitigationLink[]) => void;
  addMitigationLink: (entity: MitigationLink) => void;
  addMitigationLinks: (entity: MitigationLink[]) => void;
  removeAllMitigationLinks: () => Promise<void>;
  onDeleteWorkspace: (workspaceId: string) => Promise<void>;
}

const initialState: MitigationLinksContextApi = {
  mitigationLinkList: [],
  setMitigationLinkList: () => { },
  getLinkedMitigationLinks: () => [],
  getMitigtaionThreatLinks: () => [],
  removeMitigationLink: () => { },
  removeMitigationLinksByMitigationId: () => Promise.resolve(),
  removeMitigationLinksByLinkedEntityId: () => Promise.resolve(),
  removeMitigationLinks: () => { },
  addMitigationLink: () => { },
  addMitigationLinks: () => { },
  removeAllMitigationLinks: () => Promise.resolve(),
  onDeleteWorkspace: () => Promise.resolve(),
};

export const MitigationLinksContext = createContext<MitigationLinksContextApi>(initialState);

export const useMitigationLinksContext = () => useContext(MitigationLinksContext);
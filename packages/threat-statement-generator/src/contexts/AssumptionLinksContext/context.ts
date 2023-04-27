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
import { AssumptionLink, Assumption } from '../../customTypes';
export type View = 'list' | 'editor';

export interface AssumptionLinksContextApi {
  assumptionLinkList: AssumptionLink[];
  setAssumptionLinkList: (list: AssumptionLink[]) => void;
  getLinkedAssumptions: (linkedEntityId: string) => Assumption[];
  removeAssumptionLink: (assumptionId: string, linkedEntityId: string) => void;
  addAssumptionLink: (entity: AssumptionLink) => void;
  removeAllAssumptionLinks: () => void;
}

const initialState: AssumptionLinksContextApi = {
  assumptionLinkList: [],
  setAssumptionLinkList: () => { },
  getLinkedAssumptions: () => [],
  removeAssumptionLink: () => { },
  addAssumptionLink: () => { },
  removeAllAssumptionLinks: () => { },
};

export const AssumptionLinksContext = createContext<AssumptionLinksContextApi>(initialState);

export const useAssumptionLinksContext = () => useContext(AssumptionLinksContext);
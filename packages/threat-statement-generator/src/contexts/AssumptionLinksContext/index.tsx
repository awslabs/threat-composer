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
import { FC, PropsWithChildren, useCallback } from 'react';
import useLocalStorageState from 'use-local-storage-state';
import { AssumptionLinksContext } from './context';
import { LOCAL_STORAGE_KEY_ASSUMPTION_LINK_LIST } from '../../configs/localStorageKeys';
import { AssumptionLink } from '../../customTypes';

export interface AssumptionLinksContextProviderProps {
  workspaceId: string | null;
}

const getLocalStorageKey = (workspaceId: string | null) => {
  if (workspaceId) {
    return `${LOCAL_STORAGE_KEY_ASSUMPTION_LINK_LIST}_${workspaceId}`;
  }

  return LOCAL_STORAGE_KEY_ASSUMPTION_LINK_LIST;
};

const AssumptionLinksContextProvider: FC<PropsWithChildren<AssumptionLinksContextProviderProps>> = ({
  children,
  workspaceId: currentWorkspaceId,
}) => {
  const [assumptionLinkList, setAssumptionLinkList] = useLocalStorageState<AssumptionLink[]>(getLocalStorageKey(currentWorkspaceId), {
    defaultValue: [],
  });

  const handlRemoveAssumptionLink = useCallback((assumptionId: string, linkedEntityId: string) => {
    setAssumptionLinkList((prevList) => prevList.filter(x => !(
      x.assumptionId === assumptionId && x.linkedId === linkedEntityId
    )));
  }, [setAssumptionLinkList]);

  const handleAddAssumptionLink = useCallback((assumptionLink: AssumptionLink) => {
    setAssumptionLinkList((prevList) => {
      const foundIndex = prevList.findIndex(st =>
        st.assumptionId === assumptionLink.assumptionId &&
          st.linkedId === assumptionLink.linkedId &&
          st.type === assumptionLink.type,
      );
      if (foundIndex < 0) {
        return [...prevList, assumptionLink];
      };

      return [...prevList];
    });
  }, [setAssumptionLinkList]);

  const handleAddAssumptionLinks = useCallback((assumptionLinks: AssumptionLink[]) => {
    setAssumptionLinkList((prevList) => {
      const filteredLinks = assumptionLinks.filter(al =>
        prevList.findIndex(pl => pl.assumptionId === al.assumptionId && pl.linkedId === al.assumptionId && pl.type === al.type) < 0);
      return [...prevList, ...filteredLinks];
    });
  }, [setAssumptionLinkList]);

  const handleGetLinkedAssumptionLinks = useCallback((linkedEntityId: string) => {
    return assumptionLinkList.filter(x => x.linkedId === linkedEntityId);
  }, [assumptionLinkList]);

  const handleGetAssumptionEntityLinks = useCallback((assumptionId: string, type: AssumptionLink['type']) => {
    return assumptionLinkList.filter(x => x.assumptionId === assumptionId && x.type === type);
  }, [assumptionLinkList]);

  const handleRemoveAllAssumptionLinks = useCallback(() => {
    setAssumptionLinkList([]);
  }, []);

  return (<AssumptionLinksContext.Provider value={{
    assumptionLinkList,
    setAssumptionLinkList,
    getLinkedAssumptionLinks: handleGetLinkedAssumptionLinks,
    getAssumptionEntityLinks: handleGetAssumptionEntityLinks,
    removeAssumptionLink: handlRemoveAssumptionLink,
    addAssumptionLink: handleAddAssumptionLink,
    addAssumptionLinks: handleAddAssumptionLinks,
    removeAllAssumptionLinks: handleRemoveAllAssumptionLinks,
  }}>
    {children}
  </AssumptionLinksContext.Provider>);
};

export default AssumptionLinksContextProvider;

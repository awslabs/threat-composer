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
import { MitigationLinksContext } from './context';
import { LOCAL_STORAGE_KEY_MITIGATION_LINK_LIST } from '../../configs/localStorageKeys';
import { MitigationLink } from '../../customTypes';
import { useMitigationContext } from '../MitigationsContext/context';

export interface MitigationLinksContextProviderProps {
  workspaceId: string | null;
}

const getLocalStorageKey = (workspaceId: string | null) => {
  if (workspaceId) {
    return `${LOCAL_STORAGE_KEY_MITIGATION_LINK_LIST}_${workspaceId}`;
  }

  return LOCAL_STORAGE_KEY_MITIGATION_LINK_LIST;
};

const MitigationLinksContextProvider: FC<PropsWithChildren<MitigationLinksContextProviderProps>> = ({
  children,
  workspaceId: currentWorkspaceId,
}) => {
  const [mitigationLinkList, setMitigationLinkList] = useLocalStorageState<MitigationLink[]>(getLocalStorageKey(currentWorkspaceId), {
    defaultValue: [],
  });

  const {
    mitigationList,
  } = useMitigationContext();

  const handlRemoveMitigationLink = useCallback((mitigationId: string, linkedEntityId: string) => {
    setMitigationLinkList((prevList) => prevList.filter(x => !(
      x.mitigationId === mitigationId && x.linkedId === linkedEntityId
    )));
  }, [setMitigationLinkList]);

  const handleAddMitigationLink = useCallback((mitigationLink: MitigationLink) => {
    setMitigationLinkList((prevList) => {
      const foundIndex = prevList.findIndex(st =>
        st.mitigationId === mitigationLink.mitigationId &&
          st.linkedId === mitigationLink.linkedId,
      );
      if (foundIndex < 0) {
        return [...prevList, mitigationLink];
      };

      return [...prevList];
    });
  }, [setMitigationLinkList]);

  const handleGetLinkedMitigations = useCallback((linkedEntityId: string) => {
    const matches = mitigationLinkList.filter(x => x.linkedId === linkedEntityId).map(x => x.mitigationId);
    return mitigationList.filter(x => matches.includes(x.id));
  }, [mitigationList, mitigationLinkList]);

  const handleRemoveAllMitigationLinks = useCallback(() => {
    setMitigationLinkList([]);
  }, []);

  return (<MitigationLinksContext.Provider value={{
    mitigationLinkList,
    setMitigationLinkList,
    getLinkedMitigations: handleGetLinkedMitigations,
    removeMitigationLink: handlRemoveMitigationLink,
    addMitigationLink: handleAddMitigationLink,
    removeAllMitigationLinks: handleRemoveAllMitigationLinks,
  }}>
    {children}
  </MitigationLinksContext.Provider>);
};

export default MitigationLinksContextProvider;

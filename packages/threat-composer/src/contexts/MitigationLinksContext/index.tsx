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
import { MitigationLinksContext, useMitigationLinksContext } from './context';
import { LOCAL_STORAGE_KEY_MITIGATION_LINK_LIST } from '../../configs/localStorageKeys';
import { MitigationLink } from '../../customTypes';
import removeLocalStorageKey from '../../utils/removeLocalStorageKey';

export interface MitigationLinksContextProviderProps {
  workspaceId: string | null;
}

const getLocalStorageKey = (workspaceId: string | null) => {
  if (workspaceId) {
    return `${LOCAL_STORAGE_KEY_MITIGATION_LINK_LIST}_${workspaceId}`;
  }

  return LOCAL_STORAGE_KEY_MITIGATION_LINK_LIST;
};

export const isSameMitigationLink = (entity1: MitigationLink, entity2: MitigationLink) => {
  return entity1.mitigationId === entity2.mitigationId
    && entity1.linkedId === entity2.linkedId;
};

const MitigationLinksContextProvider: FC<PropsWithChildren<MitigationLinksContextProviderProps>> = ({
  children,
  workspaceId: currentWorkspaceId,
}) => {
  const [mitigationLinkList, setMitigationLinkList, { removeItem }] = useLocalStorageState<MitigationLink[]>(getLocalStorageKey(currentWorkspaceId), {
    defaultValue: [],
  });

  const handlRemoveMitigationLink = useCallback((mitigationId: string, linkedEntityId: string) => {
    setMitigationLinkList((prevList) => prevList.filter(x => !(
      x.mitigationId === mitigationId && x.linkedId === linkedEntityId
    )));
  }, [setMitigationLinkList]);

  const handleRemoveMitigationLinks = useCallback((mitigationLinks: MitigationLink[]) => {
    setMitigationLinkList((prevList) => {
      return prevList.filter(pl =>
        mitigationLinks.findIndex(ml => isSameMitigationLink(ml, pl)) < 0);
    });
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

  const handleAddMitigationLinks = useCallback((mitigationLinks: MitigationLink[]) => {
    setMitigationLinkList((prevList) => {
      const filteredLinks = mitigationLinks.filter(al =>
        prevList.findIndex(pl => pl.mitigationId === al.mitigationId && pl.linkedId === al.mitigationId) < 0);
      return [...prevList, ...filteredLinks];
    });
  }, [setMitigationLinkList]);

  const handleGetLinkedMitigationLinks = useCallback((linkedEntityId: string) => {
    return mitigationLinkList.filter(x => x.linkedId === linkedEntityId);
  }, [mitigationLinkList]);

  const handleGetMitigationThreatLinks = useCallback((mitigationId: string) => {
    return mitigationLinkList.filter(x => x.mitigationId === mitigationId);
  }, [mitigationLinkList]);

  const handleRemoveAllMitigationLinks = useCallback(async () => {
    removeItem();
  }, [removeItem]);

  const handleDeleteWorkspace = useCallback(async (workspaceId: string) => {
    window.setTimeout(() => {
      // to delete after the workspace is switched. Otherwise the default value is set again.
      removeLocalStorageKey(getLocalStorageKey(workspaceId));
    }, 1000);
  }, []);

  return (<MitigationLinksContext.Provider value={{
    mitigationLinkList,
    setMitigationLinkList,
    getLinkedMitigationLinks: handleGetLinkedMitigationLinks,
    getMitigtaionThreatLinks: handleGetMitigationThreatLinks,
    removeMitigationLink: handlRemoveMitigationLink,
    removeMitigationLinks: handleRemoveMitigationLinks,
    addMitigationLink: handleAddMitigationLink,
    addMitigationLinks: handleAddMitigationLinks,
    removeAllMitigationLinks: handleRemoveAllMitigationLinks,
    onDeleteWorkspace: handleDeleteWorkspace,
  }}>
    {children}
  </MitigationLinksContext.Provider>);
};

export default MitigationLinksContextProvider;

export {
  useMitigationLinksContext,
};

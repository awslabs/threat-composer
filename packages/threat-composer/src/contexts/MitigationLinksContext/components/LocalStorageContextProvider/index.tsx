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
import { LOCAL_STORAGE_KEY_MITIGATION_LINK_LIST } from '../../../../configs/localStorageKeys';
import { MitigationLink } from '../../../../customTypes';
import removeLocalStorageKey from '../../../../utils/removeLocalStorageKey';
import { MitigationLinksContext } from '../../context';
import { MitigationLinksContextProviderProps } from '../../types';
import useMitigationLinks from '../../useMitigationLinks';

export const getLocalStorageKey = (workspaceId: string | null) => {
  if (workspaceId) {
    return `${LOCAL_STORAGE_KEY_MITIGATION_LINK_LIST}_${workspaceId}`;
  }

  return LOCAL_STORAGE_KEY_MITIGATION_LINK_LIST;
};


const MitigationLinksLocalStorageContextProvider: FC<PropsWithChildren<MitigationLinksContextProviderProps>> = ({
  children,
  workspaceId: currentWorkspaceId,
}) => {
  const [mitigationLinkList, setMitigationLinkList, { removeItem }] = useLocalStorageState<MitigationLink[]>(getLocalStorageKey(currentWorkspaceId), {
    defaultValue: [],
  });

  const {
    handlRemoveMitigationLink,
    handleRemoveMitigationLinks,
    handlRemoveMitigationLinksByMitigationId,
    handlRemoveMitigationLinksByLinkedEntityId,
    handleAddMitigationLink,
    handleAddMitigationLinks,
    handleGetLinkedMitigationLinks,
    handleGetMitigationThreatLinks,
  } = useMitigationLinks(mitigationLinkList, setMitigationLinkList);

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
    removeMitigationLinksByMitigationId: handlRemoveMitigationLinksByMitigationId,
    removeMitigationLinksByLinkedEntityId: handlRemoveMitigationLinksByLinkedEntityId,
    removeMitigationLinks: handleRemoveMitigationLinks,
    addMitigationLink: handleAddMitigationLink,
    addMitigationLinks: handleAddMitigationLinks,
    removeAllMitigationLinks: handleRemoveAllMitigationLinks,
    onDeleteWorkspace: handleDeleteWorkspace,
  }}>
    {children}
  </MitigationLinksContext.Provider>);
};

export default MitigationLinksLocalStorageContextProvider;


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
import { AssumptionLink } from '@aws/threat-composer-core';
import { FC, PropsWithChildren, useCallback } from 'react';
import useLocalStorageState from 'use-local-storage-state';
import { LOCAL_STORAGE_KEY_ASSUMPTION_LINK_LIST } from '../../../../configs/localStorageKeys';
import removeLocalStorageKey from '../../../../utils/removeLocalStorageKey';
import { AssumptionLinksContext } from '../../context';
import { AssumptionLinksContextProviderProps } from '../../types';
import useAssumptionLinks from '../../useAssumptionLinks';

export const getLocalStorageKey = (workspaceId: string | null) => {
  if (workspaceId) {
    return `${LOCAL_STORAGE_KEY_ASSUMPTION_LINK_LIST}_${workspaceId}`;
  }

  return LOCAL_STORAGE_KEY_ASSUMPTION_LINK_LIST;
};

const AssumptionLinksLocalStorageContextProvider: FC<PropsWithChildren<AssumptionLinksContextProviderProps>> = ({
  children,
  workspaceId: currentWorkspaceId,
}) => {
  const [assumptionLinkList, setAssumptionLinkList, { removeItem }] = useLocalStorageState<AssumptionLink[]>(getLocalStorageKey(currentWorkspaceId), {
    defaultValue: [],
  });

  const {
    handlRemoveAssumptionLink,
    handleRemoveAssumptionLinks,
    handlRemoveAssumptionLinksByAssumptionId,
    handlRemoveAssumptionLinksByLinkedEntityId,
    handleAddAssumptionLink,
    handleAddAssumptionLinks,
    handleGetLinkedAssumptionLinks,
    handleGetAssumptionEntityLinks,
  } = useAssumptionLinks(assumptionLinkList, setAssumptionLinkList);

  const handleRemoveAllAssumptionLinks = useCallback(async () => {
    removeItem();
  }, [removeItem]);

  const handleDeleteWorkspace = useCallback(async (workspaceId: string) => {
    window.setTimeout(() => {
      // to delete after the workspace is switched. Otherwise the default value is set again.
      removeLocalStorageKey(getLocalStorageKey(workspaceId));
    }, 1000);
  }, []);

  return (<AssumptionLinksContext.Provider value={{
    assumptionLinkList,
    setAssumptionLinkList,
    getLinkedAssumptionLinks: handleGetLinkedAssumptionLinks,
    getAssumptionEntityLinks: handleGetAssumptionEntityLinks,
    removeAssumptionLink: handlRemoveAssumptionLink,
    removeAssumptionLinksByAssumptionId: handlRemoveAssumptionLinksByAssumptionId,
    removeAssumptionLinksByLinkedEntityId: handlRemoveAssumptionLinksByLinkedEntityId,
    removeAssumptionLinks: handleRemoveAssumptionLinks,
    addAssumptionLink: handleAddAssumptionLink,
    addAssumptionLinks: handleAddAssumptionLinks,
    removeAllAssumptionLinks: handleRemoveAllAssumptionLinks,
    onDeleteWorkspace: handleDeleteWorkspace,
  }}>
    {children}
  </AssumptionLinksContext.Provider>);
};

export default AssumptionLinksLocalStorageContextProvider;

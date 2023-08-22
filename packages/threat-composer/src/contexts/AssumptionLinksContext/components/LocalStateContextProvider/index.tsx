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
import { FC, PropsWithChildren, useCallback, useState } from 'react';
import { AssumptionLink } from '../../../../customTypes';
import { AssumptionLinksContext } from '../../context';
import { AssumptionLinksContextProviderProps } from '../../types';
import useAssumptionLinks from '../../useAssumptionLinks';

const AssumptionLinksLocalStorageContextProvider: FC<PropsWithChildren<AssumptionLinksContextProviderProps>> = ({
  children,
}) => {
  const [assumptionLinkList, setAssumptionLinkList] = useState<AssumptionLink[]>([]);

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
    setAssumptionLinkList([]);
  }, []);

  const handleDeleteWorkspace = useCallback(async (_workspaceId: string) => {
    setAssumptionLinkList([]);
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


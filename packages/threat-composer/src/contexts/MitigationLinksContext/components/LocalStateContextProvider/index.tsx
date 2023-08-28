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
import { MitigationLink } from '../../../../customTypes';
import { LocalStateContextProviderBaseProps } from '../../../types';
import { MitigationLinksContext } from '../../context';
import { MitigationLinksContextProviderProps } from '../../types';
import useMitigationLinks from '../../useMitigationLinks';

const MitigationLinksLocalStateContextProvider: FC<PropsWithChildren<
MitigationLinksContextProviderProps & LocalStateContextProviderBaseProps<MitigationLink[]>>> = ({
  children,
  initialValue,
}) => {
  const [mitigationLinkList, setMitigationLinkList] = useState<MitigationLink[]>(initialValue || []);

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
    setMitigationLinkList([]);
  }, []);

  const handleDeleteWorkspace = useCallback(async (_workspaceId: string) => {
    setMitigationLinkList([]);
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

export default MitigationLinksLocalStateContextProvider;


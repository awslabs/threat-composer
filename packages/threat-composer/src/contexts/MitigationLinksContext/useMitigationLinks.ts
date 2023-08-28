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
import { useCallback } from 'react';
import { MitigationLink } from '../../customTypes';

export const isSameMitigationLink = (entity1: MitigationLink, entity2: MitigationLink) => {
  return entity1.mitigationId === entity2.mitigationId
      && entity1.linkedId === entity2.linkedId;
};

const useMitigationLinks = (
  mitigationLinkList: MitigationLink[],
  setMitigationLinkList: React.Dispatch<React.SetStateAction<MitigationLink[]>>,
) => {
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

  const handlRemoveMitigationLinksByMitigationId = useCallback(async (mitigationId: string) => {
    setMitigationLinkList((prevList) => prevList.filter(x => !(
      x.mitigationId === mitigationId
    )));
  }, [setMitigationLinkList]);

  const handlRemoveMitigationLinksByLinkedEntityId = useCallback(async (linkedEntityId: string) => {
    setMitigationLinkList((prevList) => prevList.filter(x => !(
      x.linkedId === linkedEntityId
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

  return {
    handlRemoveMitigationLink,
    handleRemoveMitigationLinks,
    handlRemoveMitigationLinksByMitigationId,
    handlRemoveMitigationLinksByLinkedEntityId,
    handleAddMitigationLink,
    handleAddMitigationLinks,
    handleGetLinkedMitigationLinks,
    handleGetMitigationThreatLinks,
  };
};

export default useMitigationLinks;
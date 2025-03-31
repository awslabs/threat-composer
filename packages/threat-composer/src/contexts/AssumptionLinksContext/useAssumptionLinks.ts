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
import { useCallback } from 'react';

export const isSameAssumptionLink = (entity1: AssumptionLink, entity2: AssumptionLink) => {
  return entity1.assumptionId === entity2.assumptionId
    && entity1.linkedId === entity2.linkedId
    && entity1.type === entity2.type;
};

const useAssumptionLinks = (
  assumptionLinkList: AssumptionLink[],
  setAssumptionLinkList: React.Dispatch<React.SetStateAction<AssumptionLink[]>>,
) => {
  const handlRemoveAssumptionLink = useCallback((assumptionId: string, linkedEntityId: string) => {
    setAssumptionLinkList((prevList) => prevList.filter(x =>
      !(x.linkedId === linkedEntityId && x.assumptionId === assumptionId),
    ));
  }, [setAssumptionLinkList]);

  const handleRemoveAssumptionLinks = useCallback((assumptionLinks: AssumptionLink[]) => {
    setAssumptionLinkList((prevList) => {
      return prevList.filter(pl =>
        assumptionLinks.findIndex(al => isSameAssumptionLink(al, pl)) < 0);
    });
  }, [setAssumptionLinkList]);

  const handlRemoveAssumptionLinksByAssumptionId = useCallback(async (assumptionId: string) => {
    setAssumptionLinkList((prevList) => prevList.filter(x =>
      !(x.assumptionId === assumptionId),
    ));
  }, [setAssumptionLinkList]);

  const handlRemoveAssumptionLinksByLinkedEntityId = useCallback(async (linkedEntityId: string) => {
    setAssumptionLinkList((prevList) => prevList.filter(x =>
      !(x.linkedId === linkedEntityId),
    ));
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
        prevList.findIndex(pl => isSameAssumptionLink(al, pl)) < 0);
      return [...prevList, ...filteredLinks];
    });
  }, [setAssumptionLinkList]);

  const handleGetLinkedAssumptionLinks = useCallback((linkedEntityId: string) => {
    return assumptionLinkList.filter(x => x.linkedId === linkedEntityId);
  }, [assumptionLinkList]);

  const handleGetAssumptionEntityLinks = useCallback((assumptionId: string, type: AssumptionLink['type']) => {
    return assumptionLinkList.filter(x => x.assumptionId === assumptionId && x.type === type);
  }, [assumptionLinkList]);

  return {
    handlRemoveAssumptionLink,
    handleRemoveAssumptionLinks,
    handlRemoveAssumptionLinksByAssumptionId,
    handlRemoveAssumptionLinksByLinkedEntityId,
    handleAddAssumptionLink,
    handleAddAssumptionLinks,
    handleGetLinkedAssumptionLinks,
    handleGetAssumptionEntityLinks,
  };
};

export default useAssumptionLinks;

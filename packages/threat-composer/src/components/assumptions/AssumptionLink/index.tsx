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
import { FC, useEffect, useState, useCallback } from 'react';
import { DEFAULT_NEW_ENTITY_ID } from '../../../configs';
import { useAssumptionLinksContext } from '../../../contexts/AssumptionLinksContext/context';
import { useAssumptionsContext } from '../../../contexts/AssumptionsContext/context';
import AssumptionLinkView from '../AssumptionLinkView';

export interface AssumptionLinkProps {
  linkedEntityId: string;
  type: AssumptionLink['type'];
}

const AssumptionLinkComponent: FC<AssumptionLinkProps> = ({
  linkedEntityId,
  type,
}) => {
  const { assumptionList, saveAssumption } = useAssumptionsContext();
  const [assumptionLinks, setAssumptionLinks] = useState<AssumptionLink[]>([]);

  const { getLinkedAssumptionLinks } = useAssumptionLinksContext();

  useEffect(() => {
    const _assumptionLinks = getLinkedAssumptionLinks(linkedEntityId);
    setAssumptionLinks(_assumptionLinks || []);
  }, [getLinkedAssumptionLinks, linkedEntityId]);

  const {
    addAssumptionLink,
    removeAssumptionLink,
  } = useAssumptionLinksContext();

  const handleAddAssumptionLink = useCallback((assumptionIdOrNewAssumption: string) => {
    if (assumptionList.find(a => a.id === assumptionIdOrNewAssumption)) {
      addAssumptionLink({
        type,
        linkedId: linkedEntityId,
        assumptionId: assumptionIdOrNewAssumption,
      });
    } else {
      const newAssumption = saveAssumption({
        numericId: -1,
        content: assumptionIdOrNewAssumption,
        id: DEFAULT_NEW_ENTITY_ID,
      });
      addAssumptionLink({
        type,
        linkedId: linkedEntityId,
        assumptionId: newAssumption.id,
      });
    }
  }, [assumptionList, linkedEntityId, addAssumptionLink, saveAssumption]);

  return (<AssumptionLinkView
    assumptionList={assumptionList}
    linkedAssumptionIds={assumptionLinks.map(al => al.assumptionId) || []}
    onAddAssumptionLink={handleAddAssumptionLink}
    onRemoveAssumptionLink={(assumptionId) => removeAssumptionLink(assumptionId, linkedEntityId)}
  />);
};

export default AssumptionLinkComponent;

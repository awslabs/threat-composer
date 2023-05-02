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
import { FC, useEffect, useState } from 'react';
import { useAssumptionLinksContext } from '../../../contexts/AssumptionLinksContext/context';
import { useAssumptionsContext } from '../../../contexts/AssumptionsContext/context';
import { AssumptionLink } from '../../../customTypes';
import AssumptionLinkView from '../AssumptionLinkView';

export interface AssumptionLinkProps {
  linkedEntityId: string;
  type: AssumptionLink['type'];
}

const AssumptionLinkComponent: FC<AssumptionLinkProps> = ({
  linkedEntityId,
  type,
}) => {
  const { assumptionList } = useAssumptionsContext();
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

  return (<AssumptionLinkView
    assumptionList={assumptionList}
    linkedAssumptionIds={assumptionLinks.map(al => al.assumptionId) || []}
    onAddAssumptionLink={(assumptionId) => addAssumptionLink({
      type,
      linkedId: linkedEntityId,
      assumptionId,
    })}
    onRemoveAssumptionLink={(assumptionId) => removeAssumptionLink(assumptionId, linkedEntityId)}
  />);
};

export default AssumptionLinkComponent;
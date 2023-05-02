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
import { useMitigationLinksContext } from '../../../contexts/MitigationLinksContext/context';
import { useMitigationsContext } from '../../../contexts/MitigationsContext/context';
import { MitigationLink } from '../../../customTypes';
import MitigationLinkView from '../MitigationLinkView';

export interface MitigationLinkProps {
  linkedEntityId: string;
}

const MitigationLinkComponent: FC<MitigationLinkProps> = ({
  linkedEntityId,
}) => {
  const { mitigationList } = useMitigationsContext();
  const [mitigationLinks, setMitigationLinks] = useState<MitigationLink[]>([]);

  const { getLinkedMitigationLinks } = useMitigationLinksContext();

  useEffect(() => {
    const _mitigationLinks = getLinkedMitigationLinks(linkedEntityId);
    setMitigationLinks(_mitigationLinks || []);
  }, [getLinkedMitigationLinks, linkedEntityId]);

  const {
    addMitigationLink,
    removeMitigationLink,
  } = useMitigationLinksContext();

  return (<MitigationLinkView
    mitigationList={mitigationList}
    linkedMitigationIds={mitigationLinks.map(ml => ml.mitigationId)}
    onAddMitigationLink={(mitigationId) => addMitigationLink({
      linkedId: linkedEntityId,
      mitigationId,
    })}
    onRemoveMitigationLink={(mitigationId) => removeMitigationLink(mitigationId, linkedEntityId)}
  />);
};

export default MitigationLinkComponent;
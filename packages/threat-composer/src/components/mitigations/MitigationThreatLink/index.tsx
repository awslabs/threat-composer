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
import { MitigationLink } from '@aws/threat-composer-core';
import { FC, useEffect, useState } from 'react';
import { useMitigationLinksContext } from '../../../contexts/MitigationLinksContext/context';
import { useThreatsContext } from '../../../contexts/ThreatsContext/context';
import ThreatLinkView from '../../threats/ThreatLinkView';

export interface MitigationThreatLinkProps {
  mitigationId: string;
}

const MitigationThreatLinkComponent: FC<MitigationThreatLinkProps> = ({
  mitigationId,
}) => {
  const { statementList } = useThreatsContext();
  const [mitigationLinks, setMitigationLinks] = useState<MitigationLink[]>([]);

  const { getMitigtaionThreatLinks } = useMitigationLinksContext();

  useEffect(() => {
    const _mitigationLinks = getMitigtaionThreatLinks(mitigationId);
    setMitigationLinks(_mitigationLinks || []);
  }, [getMitigtaionThreatLinks, mitigationId]);

  const {
    addMitigationLink,
    removeMitigationLink,
  } = useMitigationLinksContext();

  return (<ThreatLinkView
    threatList={statementList}
    linkedThreatIds={mitigationLinks.map(ml => ml.linkedId)}
    onAddThreatLink={(threatId) => addMitigationLink({
      linkedId: threatId,
      mitigationId,
    })}
    onRemoveThreatLink={(threatId) => removeMitigationLink(mitigationId, threatId)}
  />);
};

export default MitigationThreatLinkComponent;
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
import { TokenGroup } from '@cloudscape-design/components';
import Autosuggest from '@cloudscape-design/components/autosuggest';
import ExpandableSection from '@cloudscape-design/components/expandable-section';
import React, { FC, useCallback, useEffect, useState } from 'react';
import { useMitigationLinksContext } from '../../../contexts/MitigationLinksContext/context';
import { useMitigationContext } from '../../../contexts/MitigationsContext/context';
import { Mitigation } from '../../../customTypes';

export interface MitigationLinkProps {
  linkedEntityId: string;
}

const MitigationLinkComponent: FC<MitigationLinkProps> = ({
  linkedEntityId,
}) => {
  const { mitigationList } = useMitigationContext();

  const {
    getLinkedMitigations,
    addMitigationLink,
    removeMitigationLink,
  } = useMitigationLinksContext();
  const [searchValue, setSearchValue] = React.useState('');

  const [linkedMitigations, setLinkedMitigations] = useState<Mitigation[]>([]);

  useEffect(() => {
    const mitigations = getLinkedMitigations(linkedEntityId);
    setLinkedMitigations(mitigations);
  }, [getLinkedMitigations, linkedEntityId]);

  const handleLinkMitigation = useCallback((value: string) => {
    addMitigationLink({
      mitigationId: value,
      linkedId: linkedEntityId,
    });
  }, [linkedEntityId]);

  return (<ExpandableSection headerText={`Linked mitigations (${linkedMitigations.length})`}>
    <Autosuggest
      onChange={({ detail }) => setSearchValue(detail.value)}
      value={searchValue}
      options={mitigationList.map(x => ({
        value: x.id,
        label: x.content,
      }))}
      onSelect={({ detail }) => handleLinkMitigation(detail.value)}
      enteredTextLabel={value => `Use: "${value}"`}
      ariaLabel="Autosuggest example with suggestions"
      placeholder="Enter mitigation"
      empty="No matches found"
    />
    <TokenGroup
      items={
        linkedMitigations.map(x => ({
          label: x.content,
          dismissLabel: `Unlink mitigation ${x.numericId}`,
        }))
      }
      onDismiss={({ detail: { itemIndex } }) => {
        removeMitigationLink(linkedMitigations[itemIndex].id, linkedEntityId);
      }}
    />
  </ExpandableSection>);
};

export default MitigationLinkComponent;
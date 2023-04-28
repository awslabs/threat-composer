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
import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { useAssumptionLinksContext } from '../../../contexts/AssumptionLinksContext/context';
import { useAssumptionsContext } from '../../../contexts/AssumptionsContext/context';
import { Assumption, AssumptionLink } from '../../../customTypes';

export interface AssumptionLinkProps {
  linkedEntityId: string;
  type: AssumptionLink['type'];
}

const AssumptionLinkComponent: FC<AssumptionLinkProps> = ({
  linkedEntityId,
  type,
}) => {
  const { assumptionList } = useAssumptionsContext();
  const [searchValue, setSearchValue] = React.useState('');

  const filteredAssumptions = useMemo(() => {
    if (!searchValue) {
      return assumptionList;
    }

    return assumptionList.filter(x => x.content.toLowerCase().indexOf(searchValue.toLowerCase()) >= 0);
  }, [searchValue, assumptionList]);

  const {
    getLinkedAssumptions,
    addAssumptionLink,
    removeAssumptionLink,
  } = useAssumptionLinksContext();

  const [linkedAssumptions, setLinkedAssumptions] = useState<Assumption[]>([]);

  useEffect(() => {
    const assumptions = getLinkedAssumptions(linkedEntityId);
    setLinkedAssumptions(assumptions);
  }, [getLinkedAssumptions, linkedEntityId]);

  const handleLinkAssumption = useCallback((value: string) => {
    addAssumptionLink({
      assumptionId: value,
      linkedId: linkedEntityId,
      type,
    });
  }, [linkedEntityId, type]);

  return (<ExpandableSection headerText={`Linked assumptions (${linkedAssumptions.length})`}>
    <Autosuggest
      onChange={({ detail }) => setSearchValue(detail.value)}
      value={searchValue}
      options={filteredAssumptions.map(x => ({
        value: x.id,
        label: x.content,
      }))}
      onSelect={({ detail }) => handleLinkAssumption(detail.value)}
      filteringType='manual'
      enteredTextLabel={value => `Use: "${value}"`}
      placeholder="Enter assumption"
      empty="No matches found"
    />
    <TokenGroup
      items={
        linkedAssumptions.map(x => ({
          label: x.content,
          dismissLabel: `Unlink assumption ${x.numericId}`,
        }))
      }
      onDismiss={({ detail: { itemIndex } }) => {
        removeAssumptionLink(linkedAssumptions[itemIndex].id, linkedEntityId);
      }}
    />
  </ExpandableSection>);
};

export default AssumptionLinkComponent;
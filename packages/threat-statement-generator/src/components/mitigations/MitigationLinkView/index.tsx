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
import Autosuggest from '@cloudscape-design/components/autosuggest';
import ExpandableSection from '@cloudscape-design/components/expandable-section';
import TokenGroup from '@cloudscape-design/components/token-group';
import React, { FC, useMemo } from 'react';
import { Mitigation } from '../../../customTypes';

export interface MitigationLinkProps {
  linkedMitigationIds: string[];
  mitigationList: Mitigation[];
  onAddMitigationLink: (mitigationId: string) => void;
  onRemoveMitigationLink: (mitigationId: string) => void;
}

const MitigationLinkComponent: FC<MitigationLinkProps> = ({
  linkedMitigationIds,
  mitigationList,
  onAddMitigationLink,
  onRemoveMitigationLink,
}) => {
  const [searchValue, setSearchValue] = React.useState('');

  const linkedMitigations = useMemo(() => {
    return mitigationList.filter(al => linkedMitigationIds.includes(al.id));
  }, [linkedMitigationIds, mitigationList]);

  const filteredMitigations = useMemo(() => {
    const mitigations = mitigationList.filter(x => !linkedMitigationIds.includes(x.id));

    if (!searchValue) {
      return mitigations;
    }

    return mitigations.filter(x => x.content.toLowerCase().indexOf(searchValue.toLowerCase()) >= 0);
  }, [searchValue, mitigationList, linkedMitigationIds]);

  return (<ExpandableSection headerText={`Linked mitigations (${linkedMitigations.length})`}>
    <Autosuggest
      onChange={({ detail }) => setSearchValue(detail.value)}
      value={searchValue}
      options={filteredMitigations.map(x => ({
        value: x.id,
        label: x.content,
      }))}
      onSelect={({ detail }) => {
        onAddMitigationLink(detail.value);
        setSearchValue('');
      }}
      filteringType='manual'
      enteredTextLabel={value => `Use: "${value}"`}
      placeholder="Enter mitigation"
      empty="No matches found"
    />
    <div
      style={{
        display: 'flex',
      }}
    >
      <TokenGroup
        items={
          linkedMitigations.map(x => ({
            label: x.content,
            dismissLabel: `Unlink mitigation ${x.numericId}`,
          }))
        }
        onDismiss={({ detail: { itemIndex } }) => {
          onRemoveMitigationLink(linkedMitigations[itemIndex].id);
        }}
      />
    </div>
  </ExpandableSection>);
};

export default MitigationLinkComponent;
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
import Button from '@cloudscape-design/components/button';
import Container from '@cloudscape-design/components/container';
import Header from '@cloudscape-design/components/header';
import SpaceBetween from '@cloudscape-design/components/space-between';
import TextFilter from '@cloudscape-design/components/text-filter';
import { FC, useCallback, useMemo, useState } from 'react';
import { useGlobalSetupContext } from '../../../contexts/GlobalSetupContext/context';
import { useMitigationsContext } from '../../../contexts/MitigationsContext/context';
import { Mitigation } from '../../../customTypes';
import GenericEntityCreationCard from '../../generic/GenericEntityCreationCard';
import MitigationCard from '../MitigationCard';

const MitigationList: FC = () => {
  const {
    mitigationList,
    removeMitigation,
    saveMitigation,
  } = useMitigationsContext();

  const {
    showInfoModal,
  } = useGlobalSetupContext();

  const [filteringText, setFilteringText] = useState('');

  const [
    selectedTags,
  ] = useState<string[]>([]);

  const handleAddTagToEntity = useCallback((assumption: Mitigation, tag: string) => {
    const updated: Mitigation = {
      ...assumption,
      tags: assumption.tags ?
        (!assumption.tags.includes(tag) ?
          [...assumption.tags, tag] : assumption.tags) :
        [tag],
    };
    saveMitigation(updated);
  }, []);

  const handleRemoveTagFromEntity = useCallback((assumption: Mitigation, tag: string) => {
    const updated: Mitigation = {
      ...assumption,
      tags: assumption.tags?.filter(t => t !== tag),
    };
    saveMitigation(updated);
  }, []);

  const filteredList = useMemo(() => {
    let output = mitigationList;

    if (filteringText) {
      output = output.filter(st => st.content && st.content.toLowerCase().indexOf(filteringText.toLowerCase()) >= 0);
    }

    if (selectedTags && selectedTags.length > 0) {
      output = output.filter(st => {
        return st.tags?.some(t => selectedTags.includes(t));
      });
    }

    output = output.sort((op1, op2) => (op2.displayOrder || Number.MAX_VALUE) - (op1.displayOrder || Number.MAX_VALUE));

    return output;
  }, [filteringText, mitigationList, selectedTags]);

  return (<div>
    <SpaceBetween direction='vertical' size='s'>
      <Container header={
        <Header
          info={<Button variant='icon' iconName='status-info' onClick={showInfoModal}/>}
        >Mitigation List</Header>
      }>
        <SpaceBetween direction='vertical' size='s'>
          <TextFilter
            filteringText={filteringText}
            filteringPlaceholder="Find threat statements"
            filteringAriaLabel="Filter threat statements"
            onChange={({ detail }) =>
              setFilteringText(detail.filteringText)
            }
          />
        </SpaceBetween>
      </Container>
      {filteredList?.map(entity => (<MitigationCard
        key={entity.id}
        entity={entity}
        onRemove={removeMitigation}
        onEdit={saveMitigation}
        onAddTagToEntity={handleAddTagToEntity}
        onRemoveTagFromEntity={handleRemoveTagFromEntity}
      />))}
      <GenericEntityCreationCard
        header='Add new mitigation'
        onSave={saveMitigation}
      />
    </SpaceBetween>
  </div>);
};

export default MitigationList;
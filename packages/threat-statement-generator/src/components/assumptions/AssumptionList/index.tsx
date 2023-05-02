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
import Grid from '@cloudscape-design/components/grid';
import Header from '@cloudscape-design/components/header';
import Multiselect from '@cloudscape-design/components/multiselect';
import SpaceBetween from '@cloudscape-design/components/space-between';
import TextFilter from '@cloudscape-design/components/text-filter';
import { FC, useCallback, useMemo, useState } from 'react';
import { useAssumptionLinksContext } from '../../../contexts';
import { useAssumptionsContext } from '../../../contexts/AssumptionsContext/context';
import { useGlobalSetupContext } from '../../../contexts/GlobalSetupContext/context';
import { Assumption, AssumptionLink } from '../../../customTypes';
import { addTagToEntity, removeTagFromEntity } from '../../../utils/entityTag';
import AssumptionCard from '../AssumptionCard';
import AssumptionCreationCard from '../AssumptionCreationCard';

const ThreatStatementList: FC = () => {
  const {
    assumptionList,
    removeAssumption,
    saveAssumption,
  } = useAssumptionsContext();

  const {
    addAssumptionLinks,
  } = useAssumptionLinksContext();

  const {
    showInfoModal,
  } = useGlobalSetupContext();

  const [filteringText, setFilteringText] = useState('');

  const [
    selectedTags,
    setSelectedTags,
  ] = useState<string[]>([]);

  const handleAddTagToEntity = useCallback((assumption: Assumption, tag: string) => {
    const updated = addTagToEntity(assumption, tag);
    saveAssumption(updated as Assumption);
  }, []);

  const handleRemoveTagFromEntity = useCallback((assumption: Assumption, tag: string) => {
    const updated = removeTagFromEntity(assumption, tag);
    saveAssumption(updated as Assumption);
  }, []);

  const filteredList = useMemo(() => {
    let output = assumptionList;

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
  }, [filteringText, assumptionList, selectedTags]);

  const hasNoFilter = useMemo(() => {
    return (filteringText === ''
      && selectedTags.length === 0);
  }, [filteringText, selectedTags]);

  const allTags = useMemo(() => {
    return assumptionList
      .reduce((all: string[], cur) => {
        return [...all, ...cur.tags?.filter(ia => !all.includes(ia)) || []];
      }, []);
  }, [assumptionList]);

  const handleClearFilter = useCallback(() => {
    setFilteringText('');
    setSelectedTags([]);
  }, []);

  const handleSaveNew = useCallback((assumption: Assumption,
    linkedMitigationIds: string[],
    linkedThreatIds: string[]) => {
    const updated = saveAssumption(assumption);

    const assumptionLinks: AssumptionLink[] = [];

    linkedMitigationIds.forEach(id => {
      assumptionLinks.push({
        linkedId: id,
        assumptionId: updated.id,
        type: 'Mitigation',
      });
    });

    linkedThreatIds.forEach(id => {
      assumptionLinks.push({
        linkedId: id,
        assumptionId: updated.id,
        type: 'Threat',
      });
    });

    addAssumptionLinks(assumptionLinks);

  }, [saveAssumption, addAssumptionLinks]);

  return (<div>
    <SpaceBetween direction='vertical' size='s'>
      <Container header={
        <Header
          info={<Button variant='icon' iconName='status-info' onClick={showInfoModal} />}
        >Assumption List</Header>
      }>
        <SpaceBetween direction='vertical' size='s'>
          <TextFilter
            filteringText={filteringText}
            filteringPlaceholder="Find assumptions"
            filteringAriaLabel="Filter assumptions"
            onChange={({ detail }) =>
              setFilteringText(detail.filteringText)
            }
          />
          <Grid
            gridDefinition={[{ colspan: { default: 12, xs: 3 } },
              { colspan: { default: 12, xs: 3 } },
              { colspan: { default: 12, xs: 3 } },
              { colspan: { default: 1 } }]}
          >
            <Multiselect
              tokenLimit={0}
              selectedOptions={selectedTags.map(ia => ({
                label: ia,
                value: ia,
              }))}
              onChange={({ detail }) =>
                setSelectedTags(detail.selectedOptions?.map(o => o.value || '') || [])
              }
              deselectAriaLabel={e => `Remove ${e.label}`}
              options={allTags.map(g => ({
                label: g,
                value: g,
              }))}
              placeholder="Filtered by tags"
              selectedAriaLabel="Selected"
            />
            <Button onClick={handleClearFilter}
              variant='icon'
              iconSvg={<svg
                focusable="false"
                aria-hidden="true"
                viewBox="0 0 24 24"
                tabIndex={-1}
              >
                <path d="M19.79 5.61C20.3 4.95 19.83 4 19 4H6.83l7.97 7.97 4.99-6.36zM2.81 2.81 1.39 4.22 10 13v6c0 .55.45 1 1 1h2c.55 0 1-.45 1-1v-2.17l5.78 5.78 1.41-1.41L2.81 2.81z"></path>
              </svg>}
              ariaLabel='Clear filters'
              disabled={hasNoFilter}
            />
          </Grid>
        </SpaceBetween>
      </Container>
      {filteredList?.map(entity => (<AssumptionCard
        key={entity.id}
        assumption={entity}
        onRemove={removeAssumption}
        onEdit={saveAssumption}
        onAddTagToAssumption={handleAddTagToEntity}
        onRemoveTagFromAssumption={handleRemoveTagFromEntity}
      />))}
      <AssumptionCreationCard
        onSave={handleSaveNew}
      />
    </SpaceBetween>
  </div>);
};

export default ThreatStatementList;
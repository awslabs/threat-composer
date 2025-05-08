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
import SpaceBetween from '@cloudscape-design/components/space-between';
import TextFilter from '@cloudscape-design/components/text-filter';
import { FC, useCallback, useMemo, useState, useRef } from 'react';
import { useAssumptionLinksContext } from '../../../contexts';
import { useAssumptionsContext } from '../../../contexts/AssumptionsContext/context';
import { Assumption, AssumptionLink } from '../../../customTypes';
import { addTagToEntity, removeTagFromEntity } from '../../../utils/entityTag';
import ContentLayout from '../../generic/ContentLayout';
import { GenericEntityCreationCardRefProps } from '../../generic/GenericEntityCreationCard';
import LinkedEntityFilter, { ALL, WITHOUT_NO_LINKED_ENTITY, WITH_LINKED_ENTITY } from '../../generic/LinkedEntityFilter';
import TagSelector from '../../generic/TagSelector';
import AssumptionCard from '../AssumptionCard';
import AssumptionCreationCard from '../AssumptionCreationCard';

const AssumptionList: FC = () => {
  const {
    assumptionList,
    removeAssumption,
    saveAssumption,
  } = useAssumptionsContext();

  const {
    assumptionLinkList,
    addAssumptionLinks,
    removeAssumptionLinksByAssumptionId,
  } = useAssumptionLinksContext();

  const [filteringText, setFilteringText] = useState('');

  const [
    selectedTags,
    setSelectedTags,
  ] = useState<string[]>([]);

  const [
    selectedLinkedThreatsFilter,
    setSelectedLinkedThreatsFilter,
  ] = useState(ALL);

  const [
    selectedLinkedMitigationFilter,
    setSelectedLinkedMitigationFilter,
  ] = useState(ALL);

  const handleAddTagToEntity = useCallback((assumption: Assumption, tag: string) => {
    const updated = addTagToEntity(assumption, tag);
    saveAssumption(updated as Assumption);
  }, []);

  const handleRemoveTagFromEntity = useCallback((assumption: Assumption, tag: string) => {
    const updated = removeTagFromEntity(assumption, tag);
    saveAssumption(updated as Assumption);
  }, []);

  const handleRemove = useCallback(async (assumptionId: string) => {
    removeAssumption(assumptionId);
    await removeAssumptionLinksByAssumptionId(assumptionId);
  }, [removeAssumption, removeAssumptionLinksByAssumptionId]);

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

    if (selectedLinkedThreatsFilter !== ALL) {
      output = output.filter(st => {
        return assumptionLinkList.some(al => al.assumptionId === st.id && al.type === 'Threat') ?
          selectedLinkedThreatsFilter === WITH_LINKED_ENTITY :
          selectedLinkedThreatsFilter === WITHOUT_NO_LINKED_ENTITY;
      });
    }

    if (selectedLinkedMitigationFilter !== ALL) {
      output = output.filter(st => {
        return assumptionLinkList.some(al => al.assumptionId === st.id && al.type === 'Mitigation') ?
          selectedLinkedMitigationFilter === WITH_LINKED_ENTITY :
          selectedLinkedMitigationFilter === WITHOUT_NO_LINKED_ENTITY;
      });
    }

    output = output.sort((op1, op2) => (op2.displayOrder || Number.MAX_VALUE) - (op1.displayOrder || Number.MAX_VALUE));

    return output;
  }, [filteringText, assumptionList, selectedTags,
    assumptionLinkList,
    selectedLinkedMitigationFilter, selectedLinkedThreatsFilter]);

  const hasNoFilter = useMemo(() => {
    return (filteringText === ''
      && selectedLinkedMitigationFilter === ALL
      && selectedLinkedThreatsFilter === ALL
      && selectedTags.length === 0);
  }, [filteringText, selectedTags, selectedLinkedThreatsFilter, selectedLinkedThreatsFilter]);

  const allTags = useMemo(() => {
    return assumptionList
      .reduce((all: string[], cur) => {
        return [...all, ...cur.tags?.filter(ia => !all.includes(ia)) || []];
      }, []);
  }, [assumptionList]);

  const handleClearFilter = useCallback(() => {
    setFilteringText('');
    setSelectedTags([]);
    setSelectedLinkedMitigationFilter(ALL);
    setSelectedLinkedThreatsFilter(ALL);
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

  const assumptionCreationCardRef = useRef<GenericEntityCreationCardRefProps>(null);

  const handleAddNewAssumption = useCallback(() => {
    assumptionCreationCardRef.current?.scrollIntoView();
    assumptionCreationCardRef.current?.focusTextarea();
  }, []);

  const actions = useMemo(() => {
    return (
      <Button variant="primary" onClick={handleAddNewAssumption}>
        Add new assumption
      </Button>
    );
  }, [handleAddNewAssumption]);

  return (<ContentLayout
    title='Assumptions'
    counter={`(${filteredList.length})`}
    actions={actions}
  >
    <SpaceBetween direction='vertical' size='s'>
      <Container>
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
            gridDefinition={[
              { colspan: { default: 12, xs: 3 } },
              { colspan: { default: 12, xs: 4 } },
              { colspan: { default: 12, xs: 4 } },
              { colspan: { default: 1 } },
            ]}
          >
            <TagSelector
              allTags={allTags}
              selectedTags={selectedTags}
              setSelectedTags={setSelectedTags}
            />
            <LinkedEntityFilter
              label='Linked threats'
              entityDisplayName='threats'
              selected={selectedLinkedThreatsFilter}
              setSelected={setSelectedLinkedThreatsFilter}
            />
            <LinkedEntityFilter
              label='Linked mitigations'
              entityDisplayName='mitigations'
              selected={selectedLinkedMitigationFilter}
              setSelected={setSelectedLinkedMitigationFilter}
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
        onRemove={handleRemove}
        onEdit={saveAssumption}
        onAddTagToAssumption={handleAddTagToEntity}
        onRemoveTagFromAssumption={handleRemoveTagFromEntity}
      />))}
      <AssumptionCreationCard
        ref={assumptionCreationCardRef}
        onSave={handleSaveNew}
      />
    </SpaceBetween>
  </ContentLayout>);
};

export default AssumptionList;

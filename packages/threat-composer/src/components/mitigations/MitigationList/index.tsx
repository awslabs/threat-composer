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
import { useAssumptionLinksContext, useMitigationLinksContext } from '../../../contexts';
import { useMitigationsContext } from '../../../contexts/MitigationsContext/context';
import { AssumptionLink, Mitigation, MitigationLink } from '../../../customTypes';
import LinkedEntityFilter, { ALL, WITHOUT_NO_LINKED_ENTITY, WITH_LINKED_ENTITY } from '../../generic/LinkedEntityFilter';
import MitigationCard from '../MitigationCard';
import MitigationCreationCard from '../MitigationCreationCard';

const MitigationList: FC = () => {
  const {
    mitigationList,
    removeMitigation,
    saveMitigation,
  } = useMitigationsContext();

  const {
    addMitigationLinks,
    mitigationLinkList,
  } = useMitigationLinksContext();

  const {
    addAssumptionLinks,
    assumptionLinkList,
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
    selectedLinkedAssumptionsFilter,
    setSelectedLinkedAssumptionsFilter,
  ] = useState(ALL);

  const hasNoFilter = useMemo(() => {
    return (filteringText === ''
      && selectedLinkedAssumptionsFilter === ALL
      && selectedLinkedThreatsFilter === ALL
      && selectedTags.length === 0);
  }, [filteringText, selectedTags,
    selectedLinkedThreatsFilter, selectedLinkedAssumptionsFilter]);

  const handleClearFilter = useCallback(() => {
    setFilteringText('');
    setSelectedTags([]);
    setSelectedLinkedAssumptionsFilter(ALL);
    setSelectedLinkedThreatsFilter(ALL);
  }, []);

  const allTags = useMemo(() => {
    return mitigationList
      .reduce((all: string[], cur) => {
        return [...all, ...cur.tags?.filter(ia => !all.includes(ia)) || []];
      }, []);
  }, [mitigationList]);

  const handleAddTagToEntity = useCallback((assumption: Mitigation, tag: string) => {
    const updated: Mitigation = {
      ...assumption,
      tags: assumption.tags ?
        (!assumption.tags.includes(tag) ?
          [...assumption.tags, tag] : assumption.tags) :
        [tag],
    };
    saveMitigation(updated);
  }, [saveMitigation]);

  const handleRemoveTagFromEntity = useCallback((assumption: Mitigation, tag: string) => {
    const updated: Mitigation = {
      ...assumption,
      tags: assumption.tags?.filter(t => t !== tag),
    };
    saveMitigation(updated);
  }, [saveMitigation]);

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

    if (selectedLinkedThreatsFilter !== ALL) {
      output = output.filter(st => {
        return mitigationLinkList.some(ml => ml. mitigationId === st.id) ?
          selectedLinkedThreatsFilter === WITH_LINKED_ENTITY :
          selectedLinkedThreatsFilter === WITHOUT_NO_LINKED_ENTITY;
      });
    }

    if (selectedLinkedAssumptionsFilter !== ALL) {
      output = output.filter(st => {
        return assumptionLinkList.some(al => al.linkedId === st.id) ?
          selectedLinkedAssumptionsFilter === WITH_LINKED_ENTITY :
          selectedLinkedAssumptionsFilter === WITHOUT_NO_LINKED_ENTITY;
      });
    }

    output = output.sort((op1, op2) => (op2.displayOrder || Number.MAX_VALUE) - (op1.displayOrder || Number.MAX_VALUE));

    return output;
  }, [filteringText, mitigationList, selectedTags,
    assumptionLinkList, mitigationLinkList,
    selectedLinkedAssumptionsFilter, selectedLinkedThreatsFilter]);

  const handleSaveNew = useCallback((mitigation: Mitigation,
    linkedAssumptionIds: string[],
    linkedThreatIds: string[]) => {
    const updated = saveMitigation(mitigation);

    const mitigationLinks: MitigationLink[] = [];
    linkedThreatIds.forEach(id => {
      mitigationLinks.push({
        linkedId: id,
        mitigationId: updated.id,
      });
    });

    addMitigationLinks(mitigationLinks);

    const assumptionLinks: AssumptionLink[] = [];
    linkedAssumptionIds.forEach(id => {
      assumptionLinks.push({
        linkedId: updated.id,
        assumptionId: id,
        type: 'Mitigation',
      });
    });

    addAssumptionLinks(assumptionLinks);

  }, [saveMitigation, addMitigationLinks, addAssumptionLinks]);

  return (<div>
    <SpaceBetween direction='vertical' size='s'>
      <Container header={
        <Header
          counter={`(${filteredList.length})`}
        >Mitigation List</Header>
      }>
        <SpaceBetween direction='vertical' size='s'>
          <TextFilter
            filteringText={filteringText}
            filteringPlaceholder="Find mitigations"
            filteringAriaLabel="Filter mitigations"
            onChange={({ detail }) =>
              setFilteringText(detail.filteringText)
            }
          />
          <Grid
            gridDefinition={[
              { colspan: { default: 12, xs: 3 } },
              { colspan: { default: 12, xs: 3 } },
              { colspan: { default: 12, xs: 3 } },
              { colspan: { default: 1 } },
            ]}
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
            <LinkedEntityFilter
              label='Linked threats'
              entityDisplayName='threats'
              selected={selectedLinkedThreatsFilter}
              setSelected={setSelectedLinkedThreatsFilter}
            />
            <LinkedEntityFilter
              label='Linked assumptions'
              entityDisplayName='assumptions'
              selected={selectedLinkedAssumptionsFilter}
              setSelected={setSelectedLinkedAssumptionsFilter}
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
      {filteredList?.map(entity => (<MitigationCard
        key={entity.id}
        entity={entity}
        onRemove={removeMitigation}
        onEdit={saveMitigation}
        onAddTagToEntity={handleAddTagToEntity}
        onRemoveTagFromEntity={handleRemoveTagFromEntity}
      />))}
      <MitigationCreationCard
        onSave={handleSaveNew}
      />
    </SpaceBetween>
  </div>);
};

export default MitigationList;
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
import { AssumptionLink, STATUS_NOT_SET, Mitigation, MitigationLink, MitigationListFilter, mitigationStatus } from '@aws/threat-composer-core';
import Button from '@cloudscape-design/components/button';
import Container from '@cloudscape-design/components/container';
import Grid from '@cloudscape-design/components/grid';
import Multiselect from '@cloudscape-design/components/multiselect';
import SpaceBetween from '@cloudscape-design/components/space-between';
import TextFilter from '@cloudscape-design/components/text-filter';
import { FC, useCallback, useMemo, useState } from 'react';
import { useAssumptionLinksContext, useMitigationLinksContext } from '../../../contexts';
import { useMitigationsContext } from '../../../contexts/MitigationsContext/context';
import ContentLayout from '../../generic/ContentLayout';
import LinkedEntityFilter, { ALL, WITHOUT_NO_LINKED_ENTITY, WITH_LINKED_ENTITY } from '../../generic/LinkedEntityFilter';
import TagSelector from '../../generic/TagSelector';
import MitigationCard from '../MitigationCard';
import MitigationCreationCard from '../MitigationCreationCard';

const ALL_STATUS = [...mitigationStatus.map(ia => ({
  label: ia.label,
  value: ia.value,
})), {
  label: 'Not Set',
  value: STATUS_NOT_SET,
}];

export interface MitigationListProps {
  initialFilter?: MitigationListFilter;
}

const MitigationList: FC<MitigationListProps> = ({
  initialFilter,
}) => {
  const {
    mitigationList,
    removeMitigation,
    saveMitigation,
  } = useMitigationsContext();

  const {
    addMitigationLinks,
    mitigationLinkList,
    removeMitigationLinksByMitigationId,
  } = useMitigationLinksContext();

  const {
    addAssumptionLinks,
    assumptionLinkList,
    removeAssumptionLinksByLinkedEntityId,
  } = useAssumptionLinksContext();

  const [filteringText, setFilteringText] = useState('');

  const [
    selectedTags,
    setSelectedTags,
  ] = useState<string[]>([]);

  const [
    selectedStatus,
    setSelectedStatus,
  ] = useState<string[]>(initialFilter?.status || []);

  const [
    selectedLinkedThreatsFilter,
    setSelectedLinkedThreatsFilter,
  ] = useState(ALL);

  const [
    selectedLinkedAssumptionsFilter,
    setSelectedLinkedAssumptionsFilter,
  ] = useState(ALL);


  const handleRemove = useCallback(async (mitigationId: string) => {
    removeMitigation(mitigationId);
    await removeAssumptionLinksByLinkedEntityId(mitigationId);
    await removeMitigationLinksByMitigationId(mitigationId);
  }, [removeAssumptionLinksByLinkedEntityId, removeMitigation, removeMitigationLinksByMitigationId]);

  const hasNoFilter = useMemo(() => {
    return (filteringText === ''
      && selectedLinkedAssumptionsFilter === ALL
      && selectedLinkedThreatsFilter === ALL
      && selectedTags.length === 0
      && selectedStatus.length === 0
    );
  }, [filteringText, selectedTags, selectedStatus,
    selectedLinkedThreatsFilter, selectedLinkedAssumptionsFilter]);

  const handleClearFilter = useCallback(() => {
    setFilteringText('');
    setSelectedTags([]);
    setSelectedStatus([]);
    setSelectedLinkedAssumptionsFilter(ALL);
    setSelectedLinkedThreatsFilter(ALL);
  }, []);

  const allTags = useMemo(() => {
    return mitigationList
      .reduce((all: string[], cur) => {
        return [...all, ...cur.tags?.filter(ia => !all.includes(ia)) || []];
      }, []);
  }, [mitigationList]);

  const handleAddTagToEntity = useCallback((mitigation: Mitigation, tag: string) => {
    const updated: Mitigation = {
      ...mitigation,
      tags: mitigation.tags ?
        (!mitigation.tags.includes(tag) ?
          [...mitigation.tags, tag] : mitigation.tags) :
        [tag],
    };
    saveMitigation(updated);
  }, [saveMitigation]);

  const handleRemoveTagFromEntity = useCallback((mitigation: Mitigation, tag: string) => {
    const updated: Mitigation = {
      ...mitigation,
      tags: mitigation.tags?.filter(t => t !== tag),
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

    if (selectedStatus && selectedStatus.length > 0) {
      output = output.filter(st => {
        return st.status ? selectedStatus.includes(st.status) : selectedStatus.includes(STATUS_NOT_SET);
      });
    }

    if (selectedLinkedThreatsFilter !== ALL) {
      output = output.filter(st => {
        return mitigationLinkList.some(ml => ml.mitigationId === st.id) ?
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
  }, [filteringText, mitigationList, selectedTags, selectedStatus,
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

  return (<ContentLayout title='Mitigations' counter={`(${filteredList.length})`}>
    <SpaceBetween direction='vertical' size='s'>
      <Container>
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
              { colspan: { default: 12, xs: 5 } },
              { colspan: { default: 12, xs: 5 } },
              { colspan: { default: 12, xs: 4 } },
              { colspan: { default: 12, xs: 4 } },
              { colspan: { default: 3 } },
            ]}
          >
            <TagSelector
              allTags={allTags}
              selectedTags={selectedTags}
              setSelectedTags={setSelectedTags}
            />
            <Multiselect
              tokenLimit={0}
              selectedOptions={ALL_STATUS.filter(x => selectedStatus.includes(x.value))}
              onChange={({ detail }) =>
                setSelectedStatus(detail.selectedOptions?.map(o => o.value || '') || [])
              }
              deselectAriaLabel={e => `Remove ${e.label}`}
              options={ALL_STATUS}
              placeholder="Filtered by status"
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
              disabled={hasNoFilter}
            >
              Clear filters
            </Button>
          </Grid>
        </SpaceBetween>
      </Container>
      {filteredList?.map(entity => (<MitigationCard
        key={entity.id}
        entity={entity}
        onRemove={handleRemove}
        onEdit={saveMitigation}
        onAddTagToEntity={handleAddTagToEntity}
        onRemoveTagFromEntity={handleRemoveTagFromEntity}
      />))}
      <MitigationCreationCard
        onSave={handleSaveNew}
      />
    </SpaceBetween>
  </ContentLayout>);
};

export default MitigationList;

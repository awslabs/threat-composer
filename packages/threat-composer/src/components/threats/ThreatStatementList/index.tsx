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
/** @jsxImportSource @emotion/react */
import Button from '@cloudscape-design/components/button';
import Container from '@cloudscape-design/components/container';
import Grid from '@cloudscape-design/components/grid';
import Header from '@cloudscape-design/components/header';
import Multiselect from '@cloudscape-design/components/multiselect';
import SpaceBetween from '@cloudscape-design/components/space-between';
import TextFilter from '@cloudscape-design/components/text-filter';
import { css } from '@emotion/react';
import { FC, PropsWithChildren, useCallback, useMemo, useState } from 'react';
import { LEVEL_SELECTOR_OPTIONS, DEFAULT_NEW_ENTITY_ID, LEVEL_NOT_SET } from '../../../configs';
import { useAssumptionLinksContext, useMitigationLinksContext } from '../../../contexts';
import { GlobalSetupContextApi, useGlobalSetupContext } from '../../../contexts/GlobalSetupContext/context';
import { useThreatsContext } from '../../../contexts/ThreatsContext/context';
import { TemplateThreatStatement, ThreatStatementListFilter, ViewNavigationEvent } from '../../../customTypes';
import threatStatus from '../../../data/status/threatStatus.json';
import useEditMetadata from '../../../hooks/useEditMetadata';
import { addTagToEntity, removeTagFromEntity } from '../../../utils/entityTag';
import AssetSelector from '../../generic/AssetSelector';
import ContentLayoutComponent, { ContentLayoutProps } from '../../generic/ContentLayout';
import LinkedEntityFilter, { ALL, WITHOUT_NO_LINKED_ENTITY, WITH_LINKED_ENTITY } from '../../generic/LinkedEntityFilter';
import { OPTIONS as STRIDEOptions } from '../../generic/STRIDESelector';
import TagSelector from '../../generic/TagSelector';
import WorkspaceSelector from '../../workspaces/WorkspaceSelector';
import SortByComponent, { SortByOption, DEFAULT_SORT_BY } from '../SortBy';
import ThreatStatementCard from '../ThreatStatementCard';

const LevelOptionsWithNoValue = [...LEVEL_SELECTOR_OPTIONS, {
  label: 'Priority Not Set', value: LEVEL_NOT_SET,
}];

const STRIDE_OPTION_NO_VALUE = {
  label: 'STRIDE Not Set', value: LEVEL_NOT_SET,
};

const STRIDEOptionsWithNoValue = [...STRIDEOptions, STRIDE_OPTION_NO_VALUE];

const LELEV_MAPPING: any = {
  High: 3,
  Medium: 2,
  Low: 1,
};

const styles = {
  btnClearFilter: css({
    height: '100%',
    display: 'flex',
    alignItems: 'flex-start',
  }),
};

const ALL_STATUS = [...threatStatus.map(ia => ({
  label: ia.label,
  value: ia.value,
})), {
  label: 'Not Set',
  value: LEVEL_NOT_SET,
}];

const ContentLayout: FC<PropsWithChildren<ContentLayoutProps & {
  composerMode: GlobalSetupContextApi['composerMode'];
}>> = ({
  composerMode,
  children,
  ...props
}) => {
  if (composerMode !== 'Full') {
    return <>{children}</>;
  }

  return (<ContentLayoutComponent
    {...props}
  >
    {children}
  </ContentLayoutComponent>);
};

export interface ThreatStatementListProps {
  initialFilter?: ThreatStatementListFilter;
  onThreatEditorView?: ViewNavigationEvent['onThreatEditorView'];
}

const ThreatStatementList: FC<ThreatStatementListProps> = ({
  initialFilter,
  onThreatEditorView,
}) => {
  const {
    statementList,
    removeStatement,
    addStatement,
    editStatement,
    saveStatement,
  } = useThreatsContext();

  const {
    assumptionLinkList,
    removeAssumptionLinksByLinkedEntityId,
  } = useAssumptionLinksContext();

  const {
    mitigationLinkList,
    removeMitigationLinksByLinkedEntityId,
  } = useMitigationLinksContext();

  const {
    showInfoModal,
    composerMode,
  } = useGlobalSetupContext();

  const handleRemove = useCallback(async (statementId: string) => {
    removeStatement(statementId);
    await removeAssumptionLinksByLinkedEntityId(statementId);
    await removeMitigationLinksByLinkedEntityId(statementId);
  }, [removeStatement, removeAssumptionLinksByLinkedEntityId, removeMitigationLinksByLinkedEntityId]);

  const [filteringText, setFilteringText] = useState('');
  const [sortBy, setSortBy] = useState<SortByOption>(DEFAULT_SORT_BY);

  const [
    selectedImpactedGoal,
    setSelectedImpactedGoal,
  ] = useState<string[]>([]);

  const [
    selectedImpactedAssets,
    setSelectedImpactedAssets,
  ] = useState<string[]>([]);

  const [
    selectedTags,
    setSelectedTags,
  ] = useState<string[]>([]);

  const [
    selectedStatus,
    setSelectedStatus,
  ] = useState<string[]>([]);

  const [
    selectedPriorities,
    setSelectedPriorities,
  ] = useState<string[]>(initialFilter && initialFilter.priority ? [initialFilter.priority] : []);

  const [
    selectedSTRIDEs,
    setSelectedSTRIDEs,
  ] = useState<string[]>(initialFilter && initialFilter.stride ? [initialFilter.stride] : []);

  const [
    selectedLinkedAssumptionFilter,
    setSelectedLinkedAssumptionFilter,
  ] = useState(initialFilter && typeof initialFilter.linkedAssumptions !== 'undefined' ? (
    initialFilter.linkedAssumptions ? WITH_LINKED_ENTITY :
      WITHOUT_NO_LINKED_ENTITY
  ) : ALL);

  const [
    selectedLinkedMitigationFilter,
    setSelectedLinkedMitigationFilter,
  ] = useState(initialFilter && typeof initialFilter.linkedMitigations !== 'undefined' ? (
    initialFilter.linkedMitigations ? WITH_LINKED_ENTITY :
      WITHOUT_NO_LINKED_ENTITY
  ) : ALL);

  const handleEditMetadata = useEditMetadata(saveStatement);

  const handleAddTagToStatement = useCallback((statement: TemplateThreatStatement, tag: string) => {
    const updatedStatement = addTagToEntity(statement, tag);
    saveStatement(updatedStatement);
  }, [saveStatement]);

  const handleRemoveTagFromStatement = useCallback((statement: TemplateThreatStatement, tag: string) => {
    const updated = removeTagFromEntity(statement, tag);
    saveStatement(updated);
  }, []);

  const handleUpdateStatementStatus = useCallback((statement: TemplateThreatStatement, status: string) => {
    saveStatement({
      ...statement,
      status,
    });
  }, [saveStatement]);

  const filteredStatementList = useMemo(() => {
    let output = statementList;

    if (filteringText) {
      output = output.filter(st => st.statement && st.statement.toLowerCase().indexOf(filteringText.toLowerCase()) >= 0);
    }

    if (selectedImpactedAssets && selectedImpactedAssets.length > 0) {
      output = output.filter(st => {
        const tst = st as TemplateThreatStatement;
        return tst.impactedAssets?.some(ia => selectedImpactedAssets.includes(ia));
      });
    }

    if (selectedImpactedGoal && selectedImpactedGoal.length > 0) {
      output = output.filter(st => {
        const tst = st as TemplateThreatStatement;
        return tst.impactedGoal?.some(ia => selectedImpactedGoal.includes(ia));
      });
    }

    if (selectedTags && selectedTags.length > 0) {
      output = output.filter(st => {
        return st.tags?.some(t => selectedTags.includes(t));
      });
    }

    if (selectedStatus && selectedStatus.length > 0) {
      output = output.filter(st => {
        return st.status ? selectedStatus.includes(st.status) : selectedStatus.includes(LEVEL_NOT_SET);
      });
    }

    if (selectedPriorities && selectedPriorities.length > 0) {
      output = output.filter(st => {
        const priority = st.metadata?.find(m => m.key === 'Priority');
        const includedNoValue = selectedPriorities.includes(LEVEL_NOT_SET);
        if (includedNoValue && (!priority || !priority.value || priority.value.length === 0)) {
          return true;
        }

        return priority?.value && selectedPriorities.includes(priority.value as string);
      });
    }

    if (selectedSTRIDEs && selectedSTRIDEs.length > 0) {
      output = output.filter(st => {
        const stride = st.metadata?.find(m => m.key === 'STRIDE');
        const includedNoValue = selectedSTRIDEs.includes(LEVEL_NOT_SET);
        if (includedNoValue && (!stride || !stride.value || stride.value.length === 0)) {
          return true;
        }

        return stride?.value && (stride.value as string[]).some(t => selectedSTRIDEs.includes(t));
      });
    }

    if (selectedLinkedAssumptionFilter !== ALL) {
      output = output.filter(st => {
        return assumptionLinkList.some(al => al.linkedId === st.id) ?
          selectedLinkedAssumptionFilter === WITH_LINKED_ENTITY :
          selectedLinkedAssumptionFilter === WITHOUT_NO_LINKED_ENTITY;
      });
    }

    if (selectedLinkedMitigationFilter !== ALL) {
      output = output.filter(st => {
        return mitigationLinkList.some(al => al.linkedId === st.id) ?
          selectedLinkedMitigationFilter === WITH_LINKED_ENTITY :
          selectedLinkedMitigationFilter === WITHOUT_NO_LINKED_ENTITY;
      });
    }

    if (sortBy.field === 'Priority') {
      output = output.sort((op1, op2) => {
        const priority1 = op1.metadata?.find(m => m.key === 'Priority')?.value as string;
        const priority2 = op2.metadata?.find(m => m.key === 'Priority')?.value as string;
        const priorityValue1 = (priority1 && LELEV_MAPPING[priority1]) || 0;
        const priorityValue2 = (priority2 && LELEV_MAPPING[priority2]) || 0;
        return priorityValue2 - priorityValue1;
      });
    } else {
      output = output.sort((op1, op2) => (op2.numericId || Number.MAX_VALUE) - (op1.numericId || Number.MAX_VALUE));
    }

    if (sortBy.ascending) {
      output = output.reverse();
    }

    return output;
  }, [filteringText, statementList,
    assumptionLinkList, mitigationLinkList,
    selectedImpactedAssets, selectedImpactedGoal,
    selectedTags, selectedStatus, selectedPriorities, selectedSTRIDEs,
    selectedLinkedAssumptionFilter, selectedLinkedMitigationFilter,
    sortBy]);

  const hasNoFilter = useMemo(() => {
    return (filteringText === ''
      && selectedImpactedAssets.length === 0
      && selectedImpactedGoal.length === 0
      && selectedTags.length === 0
      && selectedStatus.length === 0
      && selectedPriorities.length === 0
      && selectedSTRIDEs.length === 0
      && selectedLinkedAssumptionFilter === ALL
      && selectedLinkedMitigationFilter === ALL);
  }, [filteringText, selectedImpactedAssets, selectedImpactedGoal,
    selectedTags, selectedStatus, selectedPriorities, selectedSTRIDEs,
    selectedLinkedAssumptionFilter, selectedLinkedMitigationFilter]);

  const handleAddStatement = useCallback((idToCopy?: string) => {
    addStatement(idToCopy);
    onThreatEditorView?.(DEFAULT_NEW_ENTITY_ID, idToCopy);
  }, [addStatement, onThreatEditorView]);

  const handleEditStatement = useCallback((id: string) => {
    editStatement(id);
    onThreatEditorView?.(id);
  }, [editStatement, onThreatEditorView]);

  const actions = useMemo(() => {
    return (
      <>{composerMode !== 'Full' ?
        (<WorkspaceSelector
          embededMode={true}
          enabledExportAll={statementList.length > 0}
          enabledRemoveAll={statementList.length > 0}
          enabledExportFiltered={!hasNoFilter}
          filteredThreats={filteredStatementList}
        >
          <Button variant="primary" onClick={() => handleAddStatement()}>
            Add new statement
          </Button>
        </WorkspaceSelector>) :
        (<SpaceBetween direction='horizontal' size='s'>
          <Button variant="primary" onClick={() => handleAddStatement()}>
            Add new statement
          </Button>
        </SpaceBetween>)}
      </>);
  }, [
    filteredStatementList,
    handleAddStatement,
    statementList,
    hasNoFilter,
    composerMode,
  ]);

  const allImpactedGoal = useMemo(() => {
    return statementList
      .reduce((all: string[], cur) => {
        const statement = cur as TemplateThreatStatement;
        return [...all, ...statement.impactedGoal?.filter(ig => !all.includes(ig)) || []];
      }, []);
  }, [statementList]);

  const allImpactedAssets = useMemo(() => {
    return statementList
      .reduce((all: string[], cur) => {
        const statement = cur as TemplateThreatStatement;
        return [...all, ...statement.impactedAssets?.filter(ia => !all.includes(ia)) || []];
      }, []);
  }, [statementList]);

  const allTags = useMemo(() => {
    return statementList
      .reduce((all: string[], cur) => {
        return [...all, ...cur.tags?.filter(ia => !all.includes(ia)) || []];
      }, []);
  }, [statementList]);

  const handleClearFilter = useCallback(() => {
    setFilteringText('');
    setSelectedImpactedAssets([]);
    setSelectedImpactedGoal([]);
    setSelectedTags([]);
    setSelectedStatus([]);
    setSelectedPriorities([]);
    setSelectedSTRIDEs([]);
    setSelectedLinkedAssumptionFilter(ALL);
    setSelectedLinkedMitigationFilter(ALL);
  }, []);

  const gridDefinition = useMemo(() => {
    return composerMode === 'Full' ? [{ colspan: { default: 12, xs: 6, s: 3 } },
      { colspan: { default: 12, xs: 6, s: 3 } },
      { colspan: { default: 12, xs: 6, s: 3 } },
      { colspan: { default: 12, xs: 6, s: 3 } },
      { colspan: { default: 12, xs: 6, s: 5 } },
      { colspan: { default: 12, xs: 6, s: 5 } },
      { colspan: { default: 12, xs: 6, s: 4 } },
      { colspan: { default: 12, xs: 6, s: 4 } },
      { colspan: { default: 12, xs: 6, s: 4 } }] :
      [
        { colspan: { default: 12, xs: 6, s: 3 } },
        { colspan: { default: 12, xs: 6, s: 3 } },
        { colspan: { default: 12, xs: 6, s: 3 } },
        { colspan: { default: 12, xs: 6, s: 3 } },
        { colspan: { default: 12, xs: 6, s: 5 } },
        { colspan: { default: 12, xs: 6, s: 5 } },
        { colspan: { default: 2 } },
      ];
  }, [composerMode]);

  return (<ContentLayout
    composerMode={composerMode}
    title='Threats'
    actions={actions}
    counter={`(${filteredStatementList.length})`}
  >
    <SpaceBetween direction='vertical' size='s'>
      <Container header={
        composerMode === 'ThreatsOnly' ? <Header
          actions={actions}
          counter={`(${filteredStatementList.length})`}
          info={<Button variant='icon' iconName='status-info' onClick={showInfoModal} />}
        >Threats</Header> : undefined}
      >
        <SpaceBetween direction='vertical' size='s'>
          <TextFilter
            filteringText={filteringText}
            filteringPlaceholder="Find threat statements"
            filteringAriaLabel="Filter threat statements"
            onChange={({ detail }) =>
              setFilteringText(detail.filteringText)
            }
          />
          <Grid
            gridDefinition={gridDefinition}
          >
            <Multiselect
              tokenLimit={0}
              selectedOptions={selectedPriorities.map(ia => ({
                label: ia,
                value: ia,
              }))}
              onChange={({ detail }) =>
                setSelectedPriorities(detail.selectedOptions?.map(o => o.value || '') || [])
              }
              deselectAriaLabel={e => `Remove ${e.label}`}
              options={LevelOptionsWithNoValue}
              placeholder="Filtered by priority"
              selectedAriaLabel="Selected"
            />
            <Multiselect
              tokenLimit={0}
              selectedOptions={[...STRIDEOptions.filter(x => selectedSTRIDEs.includes(x.value)),
                ...selectedSTRIDEs.includes(LEVEL_NOT_SET) ? [STRIDE_OPTION_NO_VALUE] : []]}
              onChange={({ detail }) =>
                setSelectedSTRIDEs(detail.selectedOptions?.map(o => o.value || '') || [])
              }
              deselectAriaLabel={e => `Remove ${e.label}`}
              options={STRIDEOptionsWithNoValue}
              placeholder="Filtered by STRIDE"
              selectedAriaLabel="Selected"
            />
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
            <AssetSelector
              allAssets={allImpactedAssets}
              selectedAssets={selectedImpactedAssets}
              setSelectedAssets={setSelectedImpactedAssets}
            />
            <Multiselect
              tokenLimit={0}
              selectedOptions={selectedImpactedGoal.map(ig => ({
                label: ig,
                value: ig,
              }))}
              onChange={({ detail }) =>
                setSelectedImpactedGoal(detail.selectedOptions?.map(o => o.value || '') || [])
              }
              deselectAriaLabel={e => `Remove ${e.label}`}
              options={allImpactedGoal.map(g => ({
                label: g,
                value: g,
              }))}
              placeholder="Filtered by impacted goal"
              selectedAriaLabel="Selected"
            />
            {composerMode === 'Full' && <LinkedEntityFilter
              label='Linked mitigations'
              entityDisplayName='mitigations'
              selected={selectedLinkedMitigationFilter}
              setSelected={setSelectedLinkedMitigationFilter}
            />}
            {composerMode === 'Full' && <LinkedEntityFilter
              label='Linked assumptions'
              entityDisplayName='assumptions'
              selected={selectedLinkedAssumptionFilter}
              setSelected={setSelectedLinkedAssumptionFilter}
            />}
            {<div css={styles.btnClearFilter}>
              <div><Button onClick={handleClearFilter}
                disabled={hasNoFilter}
              >
                Clear filters
              </Button></div>
            </div>}
          </Grid>
          <Grid
            gridDefinition={[{ colspan: { default: 12, xs: 6 } }]}
          >
            <SortByComponent value={sortBy} setValue={setSortBy} />
          </Grid>
        </SpaceBetween>
      </Container>
      {
        filteredStatementList?.map(st => (<ThreatStatementCard
          key={st.id}
          statement={st}
          onCopy={handleAddStatement}
          onRemove={handleRemove}
          onEditInWizard={handleEditStatement}
          onEditMetadata={handleEditMetadata}
          onEditStatementStatus={handleUpdateStatementStatus}
          onAddTagToStatement={handleAddTagToStatement}
          onRemoveTagFromStatement={handleRemoveTagFromStatement}
          showLinkedEntities={composerMode === 'Full'}
        />))
      }
    </SpaceBetween >
  </ContentLayout >);
};

export default ThreatStatementList;
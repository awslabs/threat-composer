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
import { useGlobalSetupContext } from '../../../contexts/GlobalSetupContext/context';
import { useThreatsContext } from '../../../contexts/ThreatsContext/context';
import { TemplateThreatStatement } from '../../../customTypes';
import useEditMetadata from '../../../hooks/useEditMetadata';
import { addTagToEntity, removeTagFromEntity } from '../../../utils/entityTag';
import { OPTIONS as LevelOptions } from '../../generic/LevelSelector';
import { OPTIONS as STRIDEOptions } from '../../generic/STRIDESelector';
import WorkspaceSelector from '../../workspaces/WorkspaceSelector';
import SortByComponent, { SortByOption, DEFAULT_SORT_BY } from '../SortBy';
import ThreatStatementCard from '../ThreatStatementCard';

import './index.css';

const NO_VALUE = '-';

const LevelOptionsWithNoValue = [...LevelOptions, {
  label: 'Priority Not Set', value: NO_VALUE,
}];

const STRIDE_OPTION_NO_VALUE = {
  label: 'STRIDE Not Set', value: NO_VALUE,
};

const STRIDEOptionsWithNoValue = [...STRIDEOptions, STRIDE_OPTION_NO_VALUE];

const LELEV_MAPPING: any = {
  High: 3,
  Medium: 2,
  Low: 1,
};

const ThreatStatementList: FC = () => {
  const {
    statementList,
    removeStatement,
    addStatement,
    editStatement,
    saveStatement,
  } = useThreatsContext();

  const {
    showInfoModal,
    composerMode,
  } = useGlobalSetupContext();

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
    selectedPriorities,
    setSelectedPriorities,
  ] = useState<string[]>([]);

  const [
    selectedSTRIDEs,
    setSelectedSTRIDEs,
  ] = useState<string[]>([]);

  const handleEditMetadata = useEditMetadata(saveStatement);

  const handleAddTagToStatement = useCallback((statement: TemplateThreatStatement, tag: string) => {
    const updatedStatement = addTagToEntity(statement, tag);
    saveStatement(updatedStatement);
  }, [saveStatement]);

  const handleRemoveTagFromStatement = useCallback((statement: TemplateThreatStatement, tag: string) => {
    const updated = removeTagFromEntity(statement, tag);
    saveStatement(updated);
  }, []);

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

    if (selectedPriorities && selectedPriorities.length > 0) {
      output = output.filter(st => {
        const priority = st.metadata?.find(m => m.key === 'Priority');
        const includedNoValue = selectedPriorities.includes(NO_VALUE);
        if (includedNoValue && (!priority || !priority.value || priority.value.length === 0)) {
          return true;
        }

        return priority?.value && selectedPriorities.includes(priority.value as string);
      });
    }

    if (selectedSTRIDEs && selectedSTRIDEs.length > 0) {
      output = output.filter(st => {
        const stride = st.metadata?.find(m => m.key === 'STRIDE');
        const includedNoValue = selectedSTRIDEs.includes(NO_VALUE);
        if (includedNoValue && (!stride || !stride.value || stride.value.length === 0)) {
          return true;
        }

        return stride?.value && (stride.value as string[]).some(t => selectedSTRIDEs.includes(t));
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
  }, [filteringText, statementList, selectedImpactedAssets, selectedImpactedGoal, selectedTags, selectedPriorities, selectedSTRIDEs, sortBy]);

  const hasNoFilter = useMemo(() => {
    return (filteringText === ''
      && selectedImpactedAssets.length === 0
      && selectedImpactedGoal.length === 0
      && selectedTags.length === 0
      && selectedPriorities.length === 0
      && selectedSTRIDEs.length === 0);
  }, [filteringText, selectedImpactedAssets, selectedImpactedGoal, selectedTags, selectedPriorities, selectedSTRIDEs]);

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
          <Button variant="primary" onClick={() => addStatement()}>
            Add new statement
          </Button>
        </WorkspaceSelector>) :
        (<SpaceBetween direction='horizontal' size='s'>
          <Button variant="primary" onClick={() => addStatement()}>
            Add new statement
          </Button>
        </SpaceBetween>)}
      </>);
  }, [
    filteredStatementList,
    addStatement,
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
    setSelectedPriorities([]);
    setSelectedSTRIDEs([]);
  }, []);

  return (<div>
    <SpaceBetween direction='vertical' size='s'>
      <Container header={
        <Header
          actions={actions}
          info={<Button variant='icon' iconName='status-info' onClick={showInfoModal} />}
        >Threat Statement List</Header>
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
          <Grid
            gridDefinition={[{ colspan: { default: 12, xs: 6, s: 2 } },
              { colspan: { default: 12, xs: 6, s: 2 } },
              { colspan: { default: 12, xs: 6, s: 2.5 } },
              { colspan: { default: 12, xs: 6, s: 2.5 } },
              { colspan: { default: 12, xs: 5, s: 2 } },
              { colspan: { default: 1 } }]}
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
                ...selectedSTRIDEs.includes(NO_VALUE) ? [STRIDE_OPTION_NO_VALUE] : []]}
              onChange={({ detail }) =>
                setSelectedSTRIDEs(detail.selectedOptions?.map(o => o.value || '') || [])
              }
              deselectAriaLabel={e => `Remove ${e.label}`}
              options={STRIDEOptionsWithNoValue}
              placeholder="Filtered by STRIDE"
              selectedAriaLabel="Selected"
            />
            <Multiselect
              tokenLimit={0}
              selectedOptions={selectedImpactedAssets.map(ia => ({
                label: ia,
                value: ia,
              }))}
              onChange={({ detail }) =>
                setSelectedImpactedAssets(detail.selectedOptions?.map(o => o.value || '') || [])
              }
              deselectAriaLabel={e => `Remove ${e.label}`}
              options={allImpactedAssets.map(g => ({
                label: g,
                value: g,
              }))}
              placeholder="Filtered by impacted assets"
              selectedAriaLabel="Selected"
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
          <Grid
            gridDefinition={[{ colspan: { default: 12, xs: 6 } }]}
          >
            <SortByComponent value={sortBy} setValue={setSortBy} />
          </Grid>
        </SpaceBetween>
      </Container>
      {filteredStatementList?.map(st => (<ThreatStatementCard
        key={st.id}
        statement={st}
        onCopy={addStatement}
        onRemove={removeStatement}
        onEditInWizard={editStatement}
        onEditMetadata={handleEditMetadata}
        onAddTagToStatement={handleAddTagToStatement}
        onRemoveTagFromStatement={handleRemoveTagFromStatement}
        showLinkedEntities={composerMode === 'Full'}
      />))}
    </SpaceBetween>
  </div>);
};

export default ThreatStatementList;
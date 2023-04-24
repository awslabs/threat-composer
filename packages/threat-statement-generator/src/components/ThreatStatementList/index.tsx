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
import ButtonDropdown, { ButtonDropdownProps } from '@cloudscape-design/components/button-dropdown';
import Container from '@cloudscape-design/components/container';
import Grid from '@cloudscape-design/components/grid';
import Header from '@cloudscape-design/components/header';
import { CancelableEventHandler, NonCancelableEventHandler } from '@cloudscape-design/components/internal/events';
import Multiselect from '@cloudscape-design/components/multiselect';
import Select, { SelectProps } from '@cloudscape-design/components/select';
import SpaceBetween from '@cloudscape-design/components/space-between';
import TextFilter from '@cloudscape-design/components/text-filter';
import { FC, useCallback, useMemo, useState } from 'react';
import { TemplateThreatStatement } from '../../customTypes';
import AddWorkspace from '../EditWorkspace';
import FileImport from '../FileImport';
import { useGeneratorContext } from '../GeneratorContext';
import ThreatStatementCard from '../ThreatStatementCard';
import { useWorkspacesContext } from '../WorkspacesContext';

const ThreatStatementList: FC = () => {
  const {
    statementList,
    removeStatement,
    addStatement,
    exportStatementList,
    editStatement,
    saveStatement,
    importStatementList,
    removeAllStatements,
    showInfoModal,
  } = useGeneratorContext();

  const {
    currentWorkspace,
    workspaceList,
    addWorkspace,
    removeWorkspace,
    renameWorkspace,
    switchWorkspace,
  } = useWorkspacesContext();

  const [filteringText, setFilteringText] = useState('');
  const [fileImportModalVisible, setFileImportModalVisible] = useState(false);
  const [addWorkspaceModalVisible, setAddWorkspaceModalVisible] = useState(false);
  const [editWorkspaceModalVisible, setEditWorkspaceModalVisible] = useState(false);

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

  const handleAddTagToStatement = useCallback((statement: TemplateThreatStatement, tag: string) => {
    const updatedStatement: TemplateThreatStatement = {
      ...statement,
      tags: statement.tags ?
        (!statement.tags.includes(tag) ?
          [...statement.tags, tag] : statement.tags) :
        [tag],
    };
    saveStatement(updatedStatement);
  }, []);

  const handleRemoveTagFromStatement = useCallback((statement: TemplateThreatStatement, tag: string) => {
    const updatedStatement: TemplateThreatStatement = {
      ...statement,
      tags: statement.tags?.filter(t => t !== tag),
    };
    saveStatement(updatedStatement);
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

    output = output.sort((op1, op2) => (op2.displayOrder || Number.MAX_VALUE) - (op1.displayOrder || Number.MAX_VALUE));

    return output;
  }, [filteringText, statementList, selectedImpactedAssets, selectedImpactedGoal, selectedTags]);

  const workspacesOptions = useMemo(() => {
    const options: (SelectProps.Option | SelectProps.OptionGroup)[] = [
      {
        label: 'Default',
        value: 'Default',
      },
    ];

    workspaceList && workspaceList.length > 0 && options.push({
      label: 'Workspaces',
      options: workspaceList.map(w => ({
        label: w.name,
        value: w.id,
      })),
    });

    options.push({
      label: 'Add new workspace',
      value: '[AddNewWorkspace]',
    });

    return options;
  }, [workspaceList]);

  const hasNoFilter = useMemo(() => {
    return (filteringText === ''
      && selectedImpactedAssets.length === 0
      && selectedImpactedGoal.length === 0
      && selectedTags.length === 0);
  }, [filteringText, selectedImpactedAssets, selectedImpactedGoal, selectedTags]);

  const handleMoreActions: CancelableEventHandler<ButtonDropdownProps.ItemClickDetails> = useCallback(({ detail }) => {
    switch (detail.id) {
      case 'import':
        setFileImportModalVisible(true);
        break;
      case 'exportAll':
        exportStatementList(statementList);
        break;
      case 'exportFilteredList':
        exportStatementList(filteredStatementList);
        break;
      case 'removeAll':
        removeAllStatements();
        break;
      case 'delete':
        currentWorkspace && removeWorkspace(currentWorkspace.id);
        switchWorkspace(null);
        break;
      case 'renameWorkspace':
        setEditWorkspaceModalVisible(true);
        break;
      default:
        console.log('Unknown action', detail.id);
    }
  }, [statementList,
    filteredStatementList,
    removeWorkspace,
    currentWorkspace,
    removeAllStatements]);

  const handleSelectWorkspace: NonCancelableEventHandler<SelectProps.ChangeDetail> = useCallback(({ detail }) => {
    const selectedItem = detail.selectedOption;
    if (selectedItem.value === 'Default') {
      switchWorkspace(null);
    } else if (selectedItem.value === '[AddNewWorkspace]') {
      setAddWorkspaceModalVisible(true);
    } else {
      selectedItem.value && selectedItem.label && switchWorkspace({
        id: selectedItem.value,
        name: selectedItem.label,
      });
    }
  }, [switchWorkspace]);

  const actions = useMemo(() => {
    return (
      <SpaceBetween direction="horizontal" size="xs">
        <Select
          controlId='WorkspacesSelect'
          selectedOption={{
            value: currentWorkspace?.id || 'Default',
            label: `Workspace: ${currentWorkspace?.name || 'Default'}`,
          }}
          options={workspacesOptions}
          onChange={handleSelectWorkspace}
        />
        <Button variant="primary" onClick={() => addStatement()}>
          Add new statement
        </Button>
        <ButtonDropdown
          items={[
            { id: 'import', text: 'Import' },
            {
              id: 'exportAll',
              text: 'Export all statements',
              disabled: statementList.length === 0,
            },
            {
              id: 'exportFilteredList',
              text: 'Export filtered statement list',
              disabled: hasNoFilter,
            },
            {
              id: 'removeAll',
              text: 'Remove all statements',
              disabled: statementList.length === 0,
            },
            {
              id: 'delete',
              text: 'Delete workspace',
              disabled: !currentWorkspace,
            },
            {
              id: 'renameWorkspace',
              text: 'Rename workspace',
              disabled: !currentWorkspace,
            },
          ]}
          ariaLabel="More actions"
          variant="icon"
          onItemClick={handleMoreActions}
        />
      </SpaceBetween>);
  }, [filteredStatementList,
    handleSelectWorkspace,
    exportStatementList,
    addStatement,
    statementList,
    currentWorkspace,
    hasNoFilter]);

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
  }, []);

  return (<div>
    <SpaceBetween direction='vertical' size='s'>
      <Container header={
        <Header
          actions={actions}
          info={<Button variant='icon' iconName='status-info' onClick={showInfoModal}/>}
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
            gridDefinition={[{ colspan: { default: 12, xs: 3 } },
              { colspan: { default: 12, xs: 3 } },
              { colspan: { default: 12, xs: 3 } },
              { colspan: { default: 1 } }]}
          >
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
      {filteredStatementList?.map(st => (<ThreatStatementCard
        key={st.id}
        statement={st}
        onCopy={addStatement}
        onRemove={removeStatement}
        onEditInWizard={editStatement}
        onAddTagToStatement={handleAddTagToStatement}
        onRemoveTagFromStatement={handleRemoveTagFromStatement}
      />))}
    </SpaceBetween>
    {fileImportModalVisible && <FileImport
      visible={fileImportModalVisible}
      setVisible={setFileImportModalVisible}
      onImport={importStatementList} />}
    {addWorkspaceModalVisible && <AddWorkspace
      visible={addWorkspaceModalVisible}
      setVisible={setAddWorkspaceModalVisible}
      onConfirm={addWorkspace}
    />}
    {editWorkspaceModalVisible && currentWorkspace && <AddWorkspace
      visible={editWorkspaceModalVisible}
      setVisible={setEditWorkspaceModalVisible}
      editMode
      value={currentWorkspace.name}
      onConfirm={(newWorkspaceName) => renameWorkspace(currentWorkspace.id, newWorkspaceName)}
    />}
  </div>);
};

export default ThreatStatementList;
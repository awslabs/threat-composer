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
import ButtonDropdown, { ButtonDropdownProps } from '@cloudscape-design/components/button-dropdown';
import { CancelableEventHandler, NonCancelableEventHandler } from '@cloudscape-design/components/internal/events';
import Select, { SelectProps } from '@cloudscape-design/components/select';
import SpaceBetween from '@cloudscape-design/components/space-between';
import { FC, useMemo, useState, useCallback, PropsWithChildren } from 'react';
import { DEFAULT_WORKSPACE_ID, DEFAULT_WORKSPACE_LABEL } from '../../../configs/constants';
import { useWorkspacesContext } from '../../../contexts/WorkspacesContext/context';
import AddWorkspace from '../../workspaces/EditWorkspace';
import FileImport from '../../workspaces/FileImport';
export interface WorkspaceSelectorProps {
  embededMode: boolean;
  enabledExportAll?: boolean;
  onExportAll?: () => void;
  enabledExportFiltered?: boolean;
  onExportFiltered?: () => void;
  enabledRemoveAll?: boolean;
  onRemoveAll?: () => void;
  onImport: (obj: any) => void;
}

const WorkspaceSelector: FC<PropsWithChildren<WorkspaceSelectorProps>> = ({
  embededMode = true,
  children,
  enabledExportAll,
  onExportAll,
  enabledExportFiltered,
  onExportFiltered,
  enabledRemoveAll,
  onRemoveAll,
  onImport,
}) => {
  const [fileImportModalVisible, setFileImportModalVisible] = useState(false);
  const [addWorkspaceModalVisible, setAddWorkspaceModalVisible] = useState(false);
  const [editWorkspaceModalVisible, setEditWorkspaceModalVisible] = useState(false);

  const {
    currentWorkspace,
    workspaceList,
    addWorkspace,
    removeWorkspace,
    renameWorkspace,
    switchWorkspace,
  } = useWorkspacesContext();

  const workspacesOptions = useMemo(() => {
    const options: (SelectProps.Option | SelectProps.OptionGroup)[] = [
      {
        label: DEFAULT_WORKSPACE_LABEL,
        value: DEFAULT_WORKSPACE_ID,
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

  const handleSelectWorkspace: NonCancelableEventHandler<SelectProps.ChangeDetail> = useCallback(({ detail }) => {
    const selectedItem = detail.selectedOption;
    if (selectedItem.value === DEFAULT_WORKSPACE_ID) {
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

  const handleMoreActions: CancelableEventHandler<ButtonDropdownProps.ItemClickDetails> = useCallback(({ detail }) => {
    switch (detail.id) {
      case 'import':
        setFileImportModalVisible(true);
        break;
      case 'exportAll':
        onExportAll?.();
        break;
      case 'exportFilteredList':
        onExportFiltered?.();
        break;
      case 'removeAll':
        onRemoveAll?.();
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
  }, [
    onExportAll,
    onExportFiltered,
    onRemoveAll,
    removeWorkspace,
    currentWorkspace,
  ]);

  return (<>
    <SpaceBetween direction="horizontal" size="xs">
      <Select
        controlId='WorkspacesSelect'
        selectedOption={{
          value: currentWorkspace?.id || DEFAULT_WORKSPACE_ID,
          label: `Workspace: ${currentWorkspace?.name || DEFAULT_WORKSPACE_LABEL}`,
        }}
        options={workspacesOptions}
        onChange={handleSelectWorkspace}
      />
      {children}
      <ButtonDropdown
        items={[
          ...[
            { id: 'import', text: 'Import' },
            {
              id: 'exportAll',
              text: 'Export all statements',
              disabled: !enabledExportAll,
            },
          ],
          ...(embededMode ? [{
            id: 'exportFilteredList',
            text: 'Export filtered statement list',
            disabled: !enabledExportFiltered,
          },
          {
            id: 'removeAll',
            text: 'Remove all statements',
            disabled: !enabledRemoveAll,
          }] :
            []),
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
    </SpaceBetween>
    {fileImportModalVisible && <FileImport
      visible={fileImportModalVisible}
      setVisible={setFileImportModalVisible}
      onImport={onImport} />}
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
  </>);
};

export default WorkspaceSelector;
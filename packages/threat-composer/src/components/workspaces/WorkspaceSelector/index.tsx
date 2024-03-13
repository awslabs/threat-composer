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
import DeleteConfirmationDialog from '@aws-northstar/ui/components/DeleteConfirmationDialog';
import Alert from '@cloudscape-design/components/alert';
import Button from '@cloudscape-design/components/button';
import ButtonDropdown, {
  ButtonDropdownProps,
} from '@cloudscape-design/components/button-dropdown';
import {
  CancelableEventHandler,
  NonCancelableEventHandler,
} from '@cloudscape-design/components/internal/events';
import Select, { SelectProps } from '@cloudscape-design/components/select';
import SpaceBetween from '@cloudscape-design/components/space-between';
import { FC, useMemo, useState, useCallback, PropsWithChildren } from 'react';
import {
  DEFAULT_WORKSPACE_ID,
  DEFAULT_WORKSPACE_LABEL,
  EXAMPLES_SECTION_WORKSPACE_LABEL,
} from '../../../configs/constants';
import { useGlobalSetupContext } from '../../../contexts/GlobalSetupContext';
import { useWorkspaceExamplesContext } from '../../../contexts/WorkspaceExamplesContext';
import { useWorkspacesContext } from '../../../contexts/WorkspacesContext';
import {
  DataExchangeFormat,
  TemplateThreatStatement,
} from '../../../customTypes';
import useImportExport from '../../../hooks/useExportImport';
import useRemoveData from '../../../hooks/useRemoveData';
import isWorkspaceExample from '../../../utils/isWorkspaceExample';
import EditWorkspace from '../../workspaces/EditWorkspace';
import FileImport from '../../workspaces/FileImport';

export interface WorkspaceSelectorProps {
  embededMode: boolean;
  enabledExportAll?: boolean;
  enabledRemoveAll?: boolean;
  enabledExportFiltered?: boolean;
  filteredThreats?: TemplateThreatStatement[];
  singletonMode?: boolean;
  singletonPrimaryActionButtonConfig?: {
    text: string;
    eventName?: string;
    onClick?: (data: DataExchangeFormat) => void;
  };
}

const WorkspaceSelector: FC<PropsWithChildren<WorkspaceSelectorProps>> = ({
  embededMode = true,
  children,
  enabledExportAll,
  enabledExportFiltered,
  enabledRemoveAll,
  filteredThreats,
  singletonMode = false,
  singletonPrimaryActionButtonConfig,
}) => {
  const [addWorkspaceModalVisible, setAddWorkspaceModalVisible] =
    useState(false);
  const [editWorkspaceModalVisible, setEditWorkspaceModalVisible] =
    useState(false);
  const [removeDataModalVisible, setRemoveDataModalVisible] = useState(false);
  const [removeWorkspaceModalVisible, setRemoveWorkspaceModalVisible] =
    useState(false);
  const [isRemovingWorkspace, setIsRemovingWorkspace] = useState(false);

  const { workspaceExamples } = useWorkspaceExamplesContext();
  const { importData, exportAll, exportSelectedThreats, getWorkspaceData } =
    useImportExport();
  const { removeData, deleteWorkspace } = useRemoveData();

  const {
    composerMode,
    onPreview,
    onPreviewClose,
    onImported,
    fileImportModalVisible,
    setFileImportModalVisible,
  } = useGlobalSetupContext();

  const {
    currentWorkspace,
    workspaceList,
    addWorkspace,
    renameWorkspace,
    switchWorkspace,
  } = useWorkspacesContext();

  const workspacesOptions = useMemo(() => {
    const options: (SelectProps.Option | SelectProps.OptionGroup)[] = [
      {
        label: DEFAULT_WORKSPACE_LABEL,
        value: DEFAULT_WORKSPACE_ID,
      },
      {
        label: EXAMPLES_SECTION_WORKSPACE_LABEL,
        options: workspaceExamples.map((we) => ({
          label: we.name,
          value: we.id,
        })),
      },
    ];

    workspaceList &&
      workspaceList.length > 0 &&
      options.push({
        label: 'Workspaces',
        options: workspaceList.map((w) => ({
          label: w.name,
          value: w.id,
        })),
      });

    return options;
  }, [workspaceList]);

  const handleSelectWorkspace: NonCancelableEventHandler<SelectProps.ChangeDetail> =
    useCallback(
      ({ detail }) => {
        const selectedItem = detail.selectedOption;
        if (selectedItem.value === DEFAULT_WORKSPACE_ID) {
          switchWorkspace(null);
        } else {
          selectedItem.value &&
            selectedItem.label &&
            switchWorkspace(selectedItem.value);
        }
      },
      [switchWorkspace],
    );

  const handleSingletonPrimaryButtonClick = useCallback(() => {
    if (singletonPrimaryActionButtonConfig) {
      const data = getWorkspaceData();
      singletonPrimaryActionButtonConfig.onClick?.(data);
      singletonPrimaryActionButtonConfig.eventName &&
        window.threatcomposer.dispatchEvent(
          new CustomEvent(singletonPrimaryActionButtonConfig.eventName, {
            detail: data,
          }),
        );
    } else {
      exportAll();
    }
  }, [singletonPrimaryActionButtonConfig, getWorkspaceData, exportAll]);

  const handleMoreActions: CancelableEventHandler<ButtonDropdownProps.ItemClickDetails> =
    useCallback(
      async ({ detail }) => {
        switch (detail.id) {
          case 'add':
            setAddWorkspaceModalVisible(true);
            break;
          case 'import':
            setFileImportModalVisible(true);
            break;
          case 'exportAll':
            exportAll();
            break;
          case 'exportFilteredList':
            exportSelectedThreats(filteredThreats || []);
            break;
          case 'removeAll':
            setRemoveDataModalVisible(true);
            break;
          case 'delete':
            currentWorkspace && setRemoveWorkspaceModalVisible(true);
            break;
          case 'renameWorkspace':
            setEditWorkspaceModalVisible(true);
            break;
          default:
            console.log('Unknown action', detail.id);
        }
      },
      [
        setFileImportModalVisible,
        exportAll,
        exportSelectedThreats,
        filteredThreats,
        deleteWorkspace,
        currentWorkspace,
        setRemoveDataModalVisible,
        setRemoveWorkspaceModalVisible,
        setAddWorkspaceModalVisible,
        setEditWorkspaceModalVisible,
        handleSingletonPrimaryButtonClick,
      ],
    );

  const handleRemoveData = useCallback(async () => {
    try {
      await removeData?.();
    } catch (e) {
      console.log('Error in removing data from workspace', e);
    } finally {
      setRemoveDataModalVisible(false);
    }
  }, [removeData]);

  const handleDeleteWorkspace = useCallback(
    async (toDeleteWorkspaceId: string) => {
      setIsRemovingWorkspace(true);

      try {
        await deleteWorkspace(toDeleteWorkspaceId);
      } catch (e) {
        console.log('Error in deleting workspace', e);
      } finally {
        setRemoveWorkspaceModalVisible(false);
        setIsRemovingWorkspace(false);
      }
    },
    [],
  );

  const handleImport = useCallback(
    async (data: DataExchangeFormat) => {
      await importData(data);
      onImported?.();
    },
    [importData, onImported],
  );

  const buttonDropdownItems = useMemo(() => {
    const items: ButtonDropdownProps.Item[] = [];

    if (singletonMode && singletonPrimaryActionButtonConfig) {
      // If primary action button is not specified, use Export data as primary action button in Singleton app mode.
      items.push({
        id: 'exportAll',
        text: 'Export data',
      });
    }

    if (!singletonMode) {
      items.push(
        { id: 'add', text: 'Add new workspace' },
        {
          id: 'import',
          text: 'Import',
          disabled: isWorkspaceExample(currentWorkspace?.id),
        },
        {
          id: 'exportAll',
          text: embededMode
            ? 'Export all statements from current workspace'
            : 'Export data from current workspace',
          disabled: embededMode && !enabledExportAll,
        },
      );
    } else {
      items.push({
        id: 'import',
        text: 'Import',
      });
    }

    if (embededMode) {
      items.push({
        id: 'exportFilteredList',
        text: 'Export filtered statement list from current workspace',
        disabled: !enabledExportFiltered,
      });
    }

    if (singletonMode) {
      items.push({
        id: 'removeAll',
        text: 'Remove data',
      });
    } else {
      items.push({
        id: 'removeAll',
        text: embededMode
          ? 'Remove all statements from current workspace'
          : 'Remove data from current workspace',
        disabled:
          (embededMode && !enabledRemoveAll) ||
          isWorkspaceExample(currentWorkspace?.id),
      });
    }

    if (!singletonMode) {
      items.push(
        {
          id: 'delete',
          text: 'Delete workspace',
          disabled:
            !currentWorkspace || isWorkspaceExample(currentWorkspace.id),
        },
        {
          id: 'renameWorkspace',
          text: 'Rename workspace',
          disabled:
            !currentWorkspace || isWorkspaceExample(currentWorkspace.id),
        },
      );
    }

    return items;
  }, [
    singletonMode,
    singletonPrimaryActionButtonConfig,
    embededMode,
    enabledRemoveAll,
    enabledExportAll,
    enabledExportFiltered,
    currentWorkspace,
  ]);

  return (
    <>
      <SpaceBetween direction="horizontal" size="xs">
        {!singletonMode && (
          <Select
            controlId="WorkspacesSelect"
            selectedOption={{
              value: currentWorkspace?.id || DEFAULT_WORKSPACE_ID,
              label: `Workspace: ${
                currentWorkspace?.name || DEFAULT_WORKSPACE_LABEL
              }`,
            }}
            options={workspacesOptions}
            onChange={handleSelectWorkspace}
          />
        )}
        {singletonMode && (
          <Button variant="primary" onClick={handleSingletonPrimaryButtonClick}>
            {singletonPrimaryActionButtonConfig
              ? singletonPrimaryActionButtonConfig.text
              : 'Export data'}
          </Button>
        )}
        {children}
        {buttonDropdownItems.length > 0 && (
          <ButtonDropdown
            items={buttonDropdownItems}
            ariaLabel="More actions"
            variant="icon"
            onItemClick={handleMoreActions}
          />
        )}
      </SpaceBetween>
      {fileImportModalVisible && (
        <FileImport
          composerMode={composerMode}
          visible={fileImportModalVisible}
          setVisible={setFileImportModalVisible}
          onExport={exportAll}
          onImport={handleImport}
          onPreview={onPreview}
          onPreviewClose={onPreviewClose}
        />
      )}
      {addWorkspaceModalVisible && (
        <EditWorkspace
          visible={addWorkspaceModalVisible}
          setVisible={setAddWorkspaceModalVisible}
          onConfirm={async (workspaceName: string) => {
            await addWorkspace(workspaceName);
          }}
          workspaceList={workspaceList}
        />
      )}
      {editWorkspaceModalVisible && currentWorkspace && (
        <EditWorkspace
          visible={editWorkspaceModalVisible}
          setVisible={setEditWorkspaceModalVisible}
          editMode
          value={currentWorkspace.name}
          onConfirm={(newWorkspaceName) =>
            renameWorkspace(currentWorkspace.id, newWorkspaceName)
          }
          currentWorkspace={currentWorkspace}
          workspaceList={workspaceList}
        />
      )}
      {removeDataModalVisible && (
        <DeleteConfirmationDialog
          variant="friction"
          visible={removeDataModalVisible}
          title="Delete data from current workspace?"
          onCancelClicked={() => setRemoveDataModalVisible(false)}
          onDeleteClicked={handleRemoveData}
          deleteButtonText="Remove data"
        >
          <Alert
            action={<Button onClick={() => exportAll()}>Export data</Button>}
            type="warning"
          >
            Delete{' '}
            <b>
              Data from{' '}
              {currentWorkspace
                ? `workspace ${currentWorkspace.name}`
                : 'Default workspace'}
            </b>{' '}
            permenantly? This action cannot be undone.
            <br />
            You can export the data to a json file as backup.
          </Alert>
        </DeleteConfirmationDialog>
      )}
      {removeWorkspaceModalVisible && currentWorkspace && (
        <DeleteConfirmationDialog
          variant="friction"
          visible={removeWorkspaceModalVisible}
          title="Delete Workspace?"
          onCancelClicked={() => setRemoveWorkspaceModalVisible(false)}
          onDeleteClicked={() => handleDeleteWorkspace(currentWorkspace.id)}
          loading={isRemovingWorkspace}
          deleteButtonText="Delete workspace"
        >
          <Alert
            action={<Button onClick={() => exportAll()}>Export data</Button>}
            type="warning"
          >
            Delete <b>workspace {currentWorkspace?.name}</b> permenantly? All
            the data inside workspace will be deleted. This action cannot be
            undone.
            <br />
            You can export the data to a json file as backup.
          </Alert>
        </DeleteConfirmationDialog>
      )}
    </>
  );
};

export default WorkspaceSelector;

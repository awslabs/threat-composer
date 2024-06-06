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
import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import FormField from '@cloudscape-design/components/form-field';
import Header from '@cloudscape-design/components/header';
import { InputProps } from '@cloudscape-design/components/input';
import Modal from '@cloudscape-design/components/modal';
import SpaceBetween from '@cloudscape-design/components/space-between';
import React, { FC, RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { WorkspaceSchema, Workspace } from '../../../customTypes';
import Input from '../../generic/Input';

export interface EditWorkspaceProps {
  visible: boolean;
  setVisible: React.Dispatch<React.SetStateAction<boolean>>;
  onConfirm: (workspace: string) => Promise<void>;
  value?: string;
  editMode?: boolean;
  currentWorkspace?: Workspace;
  workspaceList: Workspace[];
  exampleWorkspaceList: Workspace[];
}

const EditWorkspace: FC<EditWorkspaceProps> = ({
  visible,
  setVisible,
  onConfirm,
  editMode = false,
  workspaceList,
  exampleWorkspaceList,
  currentWorkspace,
  ...props
}) => {
  const inputRef = useRef<InputProps.Ref>();
  const [value, setValue] = useState(props.value || '');
  const [errorText, setErrorText] = useState('');

  useEffect(() => {
    setErrorText('');
  }, [value]);

  const handleConfirm = useCallback(async () => {
    setErrorText('');
    if (workspaceList.find(x => x.name === value && (!currentWorkspace || currentWorkspace.id !== x.id))) {
      setErrorText('A workspace already exists with that name');
    } else if (exampleWorkspaceList.find(x => x.name === value)) {
      setErrorText('A workspace example already exists with that name');
    } else {
      await onConfirm(value);
      setVisible(false);
    }
  }, [onConfirm, value, workspaceList, exampleWorkspaceList, currentWorkspace]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [inputRef.current]);

  const footer = useMemo(() => {
    return (<Box float="right">
      <SpaceBetween direction="horizontal" size="xs">
        <Button variant="link" onClick={() => setVisible(false)}>Cancel</Button>
        <Button variant="primary" disabled={value.length < 3} onClick={handleConfirm}>{
          editMode ? 'Update' : 'Add'
        }</Button>
      </SpaceBetween>
    </Box>);
  }, [setVisible, handleConfirm, value, editMode]);

  return <Modal
    header={<Header>{editMode ? 'Update workspace' : 'Add new workspace'}</Header>}
    visible={visible}
    footer={footer}
    onDismiss={() => setVisible(false)}
  >
    <SpaceBetween direction="vertical" size="m">
      <FormField
        label="Workspace name"
        errorText={errorText}
      >
        <Input ref={inputRef as RefObject<InputProps.Ref>}
          value={value}
          onChange={({ detail }) => setValue(detail.value)}
          validateData={WorkspaceSchema.shape.name.safeParse}
        />
      </FormField>
    </SpaceBetween>
  </Modal>;
};

export default EditWorkspace;
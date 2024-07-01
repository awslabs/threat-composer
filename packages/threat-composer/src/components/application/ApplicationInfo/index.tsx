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
import FormField from '@cloudscape-design/components/form-field';
import Header from '@cloudscape-design/components/header';
import SpaceBetween from '@cloudscape-design/components/space-between';
import { FC, useState, useCallback, useMemo, useEffect } from 'react';
import { useApplicationInfoContext } from '../../../contexts/ApplicationContext/context';
import { ApplicationInfoSchema, EditableComponentBaseProps } from '../../../customTypes';
import ContentLayout from '../../generic/ContentLayout';
import Input from '../../generic/Input';
import MarkdownEditor from '../../generic/MarkdownEditor';
import MarkdownViewer from '../../generic/MarkdownViewer';

const ApplicationInfo: FC<EditableComponentBaseProps> = ({
  onEditModeChange,
  MarkdownEditorComponentType = MarkdownEditor,
}) => {
  const { applicationInfo, setApplicationInfo } = useApplicationInfoContext();
  const [editMode, setEditMode] = useState(!applicationInfo.name && !applicationInfo.description);
  const [content, setContent] = useState('');
  const [name, setName] = useState('');

  useEffect(() => {
    onEditModeChange?.(editMode);
  }, [editMode]);

  const handleSaveApplicationInfo = useCallback(() => {
    setApplicationInfo(prev => ({
      ...prev,
      description: content,
      name,
    }));
    setEditMode(false);
  }, [content, name, setApplicationInfo, setEditMode]);

  const handleEdit = useCallback(() => {
    setContent(applicationInfo.description || '');
    setName(applicationInfo.name || '');
    setEditMode(true);
  }, [applicationInfo]);

  const actions = useMemo(() => {
    return editMode ? (<SpaceBetween direction='horizontal' size='s'>
      <Button onClick={() => setEditMode(false)}>Cancel</Button>
      <Button variant='primary' onClick={handleSaveApplicationInfo}>Confirm</Button>
    </SpaceBetween>) : (<Button onClick={handleEdit}>Edit</Button>);
  }, [editMode, handleSaveApplicationInfo, handleEdit, setEditMode]);

  return (<ContentLayout title='Application information'>
    <Container
      header={<Header actions={actions}>{applicationInfo.name || 'Application Introduction'}</Header>}
    >{editMode ? (<SpaceBetween direction='vertical' size='s'>
        <FormField
          label="Application name"
        >
          <Input
            value={name}
            onChange={event =>
              setName(event.detail.value)
            }
            validateData={ApplicationInfoSchema.shape.name.safeParse}
            placeholder='Enter application name'
          />
        </FormField>
        <MarkdownEditorComponentType
          value={content}
          onChange={setContent}
          label='Description'
          parentHeaderLevel='h2'
          validateData={ApplicationInfoSchema.shape.description.safeParse}
        />
      </SpaceBetween>) :
        (<MarkdownViewer>
          {applicationInfo.description || ''}
        </MarkdownViewer>)}
    </Container>
  </ContentLayout>);
};

export default ApplicationInfo;
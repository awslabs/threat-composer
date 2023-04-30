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
import Header from '@cloudscape-design/components/header';
import SpaceBetween from '@cloudscape-design/components/space-between';
import React, { FC, useState, useCallback, useMemo } from 'react';
import { useApplicationInfoContext } from '../../../contexts/ApplicationContext/context';
import MarkdownEditor from '../../generic/MarkdownEditor';
import MarkdownViewer from '../../generic/MarkdownViewer';


const ApplicationInfo: FC = () => {
  const { applicationInfo, setApplicationInfo } = useApplicationInfoContext();
  const [editMode, setEditMode] = useState(false);
  const [content, setContent] = useState('');

  const handleSaveApplicationInfo = useCallback(() => {
    setApplicationInfo(prev => ({
      ...prev,
      description: content,
    }));
    setEditMode(false);
  }, [content, setApplicationInfo, setEditMode]);

  const handleEdit = useCallback(() => {
    setContent(applicationInfo.description || '');
    setEditMode(true);
  }, [applicationInfo]);

  const actions = useMemo(() => {
    return editMode ? (<SpaceBetween direction='horizontal' size='s'>
      <Button onClick={() => setEditMode(false)}>Cancel</Button>
      <Button variant='primary' onClick={handleSaveApplicationInfo}>Confirm</Button>
    </SpaceBetween>) : (<Button onClick={handleEdit}>Edit</Button>);
  }, [editMode, handleSaveApplicationInfo, handleEdit, setEditMode]);

  return (<Container
    header={<Header actions={actions}>Application Information</Header>}
  >{editMode ? (<MarkdownEditor value={content} onChange={setContent} label='Description' />) :
      (<MarkdownViewer>
        {applicationInfo.description || ''}
      </MarkdownViewer>)}
  </Container>);
};

export default ApplicationInfo;
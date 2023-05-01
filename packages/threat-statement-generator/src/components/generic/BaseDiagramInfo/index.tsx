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
import { FC, useCallback, useState, useMemo } from 'react';
import { BaseImageInfo } from '../../../customTypes';
import ImageEdit from '../ImageEdit';
import MarkdownEditor from '../MarkdownEditor';
import MarkdownViewer from '../MarkdownViewer';

export interface BaseDiagramInfoProps {
  entity: BaseImageInfo;
  headerTitle: string;
  diagramTitle: string;
  onConfirm: (info: BaseImageInfo) => void;
}

const BaseDiagramInfo: FC<BaseDiagramInfoProps> = ({
  headerTitle,
  diagramTitle,
  entity,
  onConfirm,
}) => {
  const [editMode, setEditMode] = useState(false);
  const [image, setImage] = useState<string>('');
  const [content, setContent] = useState('');

  const handleSaveDiagramInfo = useCallback(() => {
    onConfirm({
      image,
      description: content,
    });
    setEditMode(false);
  }, [image, content, onConfirm]);

  const handleEdit = useCallback(() => {
    setContent(entity.description || '');
    setImage(entity.image || '');
    setEditMode(true);
  }, [entity, setContent, setEditMode, setImage]);

  const actions = useMemo(() => {
    return editMode ? (<SpaceBetween direction='horizontal' size='s'>
      <Button onClick={() => setEditMode(false)}>Cancel</Button>
      <Button variant='primary' onClick={handleSaveDiagramInfo}>Confirm</Button>
    </SpaceBetween>) : (<Button onClick={handleEdit}>Edit</Button>);
  }, [editMode, handleSaveDiagramInfo, handleEdit, setEditMode]);

  return (<Container header={<Header actions={actions}>{headerTitle}</Header>}>
    {editMode ? (<SpaceBetween direction='vertical' size='s'>
      <MarkdownEditor label='Introduction' value={content} onChange={setContent} />
      <Header variant='h3'>Architecture Diagram</Header>
      <ImageEdit value={image} onChange={setImage} />
    </SpaceBetween>) :
      (<SpaceBetween direction='vertical' size='s'>
        <Header variant='h3' key='diagramInfo'>Introduction</Header>
        <MarkdownViewer>
          {entity.description || ''}
        </MarkdownViewer>
        <Header variant='h3' key='diagram'>{diagramTitle}</Header>
        {entity.image && <img width={1024} src={entity.image} alt={diagramTitle} />}
      </SpaceBetween>)}
  </Container>
  );
};

export default BaseDiagramInfo;
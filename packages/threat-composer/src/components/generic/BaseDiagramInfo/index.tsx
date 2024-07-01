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
import Header from '@cloudscape-design/components/header';
import SpaceBetween from '@cloudscape-design/components/space-between';
import { FC, useCallback, useState, useMemo, useEffect } from 'react';
import { BaseImageInfo, EditableComponentBaseProps } from '../../../customTypes';
import imageStyles from '../../../styles/image';
import ContentLayout from '../../generic/ContentLayout';
import ImageEdit from '../ImageEdit';
import MarkdownEditor, { MarkdownEditorProps } from '../MarkdownEditor';
import MarkdownViewer from '../MarkdownViewer';

export interface BaseDiagramInfoProps extends EditableComponentBaseProps {
  entity: BaseImageInfo;
  headerTitle: string;
  diagramTitle: string;
  onConfirm: (info: BaseImageInfo) => void;
  validateData?: MarkdownEditorProps['validateData'];
}

const BaseDiagramInfo: FC<BaseDiagramInfoProps> = ({
  headerTitle,
  diagramTitle,
  entity,
  onConfirm,
  validateData,
  onEditModeChange,
  MarkdownEditorComponentType = MarkdownEditor,
}) => {
  const [editMode, setEditMode] = useState(!entity.description && !entity.image);
  const [image, setImage] = useState<string>('');
  const [content, setContent] = useState('');

  useEffect(() => {
    onEditModeChange?.(editMode);
  }, [editMode]);

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
      <Button key='cancelBtn' onClick={() => setEditMode(false)}>Cancel</Button>
      <Button key='confirmBtn' variant='primary' onClick={handleSaveDiagramInfo}>Confirm</Button>
    </SpaceBetween>) : (<Button onClick={handleEdit}>Edit</Button>);
  }, [editMode, handleSaveDiagramInfo, handleEdit, setEditMode]);

  return (<ContentLayout
    title={headerTitle}
    actions={actions}
  >
    <Container>
      {editMode ? (<SpaceBetween direction='vertical' size='s'>
        <MarkdownEditorComponentType
          label='Introduction'
          value={content}
          onChange={setContent}
          parentHeaderLevel='h3'
          validateData={validateData}
        />
        <Header variant='h3'>{headerTitle} Diagram</Header>
        <ImageEdit value={image} onChange={setImage} />
      </SpaceBetween>) :
        (<SpaceBetween direction='vertical' size='s'>
          <Header variant='h3' key='diagramInfo'>Introduction</Header>
          <MarkdownViewer>
            {entity.description || ''}
          </MarkdownViewer>
          <Header variant='h3' key='diagram'>{diagramTitle}</Header>
          {entity.image && <img css={imageStyles} src={entity.image} alt={diagramTitle} />}
        </SpaceBetween>)}
    </Container>
  </ContentLayout>
  );
};

export default BaseDiagramInfo;
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
import ColumnLayout from '@cloudscape-design/components/column-layout';
import SpaceBetween from '@cloudscape-design/components/space-between';
import { ReactNode, useCallback, forwardRef, useRef, useImperativeHandle } from 'react';
import { DEFAULT_NEW_ENTITY_ID } from '../../../configs';
import { ContentEntityBase, EntityBase } from '../../../customTypes';
import useEditMetadata from '../../../hooks/useEditMetadata';
import { addTagToEntity, removeTagFromEntity } from '../../../utils/entityTag';
import Textarea, { TextAreaProps } from '../../generic/Textarea';
import MetadataEditor from '../EntityMetadataEditor';
import GenericCard from '../GenericCard';

export interface GenericEntityCreationCardRef {
  scrollIntoView: () => void;
  focusTextarea: () => void;
}

export interface GenericEntityCreationCardProps {
  editingEntity: ContentEntityBase;
  setEditingEntity: React.Dispatch<React.SetStateAction<ContentEntityBase>>;
  header: string;
  onSave?: () => void;
  onReset?: () => void;
  customEditors?: ReactNode;
  validateData?: TextAreaProps['validateData'];
}

const GenericEntityCreationCard = forwardRef<GenericEntityCreationCardRef, GenericEntityCreationCardProps>(({
  editingEntity,
  setEditingEntity,
  header,
  onSave,
  onReset,
  customEditors,
  validateData,
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useImperativeHandle(ref, () => ({
    scrollIntoView: () => {
      containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    },
    focusTextarea: () => {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 300); // Small delay to ensure scroll completes first
    },
  }));

  const handleAddTagToEntity = useCallback((tag: string) => {
    const updated = addTagToEntity(editingEntity, tag);
    setEditingEntity(updated as ContentEntityBase);
  }, [editingEntity, setEditingEntity]);

  const handleRemoveTagFromEntity = useCallback((tag: string) => {
    const updated = removeTagFromEntity(editingEntity, tag);
    setEditingEntity(updated as ContentEntityBase);
  }, [editingEntity, setEditingEntity]);

  const handleEditMetadata = useEditMetadata(setEditingEntity as (updated: EntityBase) => void);

  return (
    <div ref={containerRef}>
      <GenericCard
        header={header}
        tags={editingEntity?.tags}
        entityId={DEFAULT_NEW_ENTITY_ID}
        onAddTagToEntity={(_entityId, tag) => handleAddTagToEntity?.(tag)}
        onRemoveTagFromEntity={(_entityId, tag) => handleRemoveTagFromEntity?.(tag)}
      >
        <SpaceBetween direction='vertical' size='s'>
          <SpaceBetween direction='horizontal' size='s'>
            <Button onClick={onReset}>Reset</Button>
            <Button variant='primary' disabled={!editingEntity.content} onClick={onSave}>Save</Button>
          </SpaceBetween>
          <ColumnLayout columns={customEditors ? 2 : 1}>
            <Textarea
              value={editingEntity.content}
              onChange={({ detail }) => setEditingEntity({
                ...editingEntity,
                content: detail.value,
              })}
              validateData={validateData}
              singleLine
              ref={textareaRef}
            />
            {customEditors}
          </ColumnLayout>
          <MetadataEditor
            variant='default'
            entity={editingEntity}
            onEditEntity={handleEditMetadata}
            defaultExpanded={true}
          />
        </SpaceBetween>
      </GenericCard>
    </div>
  );
});

export default GenericEntityCreationCard;

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
import Textarea from '@cloudscape-design/components/textarea';
import { FC, ReactNode, useCallback } from 'react';
import { DEFAULT_NEW_ENTITY_ID } from '../../../configs';
import { ContentEntityBase } from '../../../customTypes';
import { addTagToEntity, removeTagFromEntity } from '../../../utils/entityTag';
import GenericCard from '../GenericCard';

export interface GenericEntityCreationCardProps {
  editingEntity: ContentEntityBase;
  setEditingEntity: React.Dispatch<React.SetStateAction<ContentEntityBase>>;
  header: string;
  onSave?: () => void;
  onReset?: () => void;
  customEditors?: ReactNode;
}

export const DEFAULT_ENTITY = {
  id: DEFAULT_NEW_ENTITY_ID,
  numericId: -1,
  content: '',
};

const GenericEntityCreationCard: FC<GenericEntityCreationCardProps> = ({
  editingEntity,
  setEditingEntity,
  header,
  onSave,
  onReset,
  customEditors,
}) => {
  const handleAddTagToEntity = useCallback((tag: string) => {
    const updated = addTagToEntity(editingEntity, tag);
    setEditingEntity(updated as ContentEntityBase);
  }, [editingEntity]);

  const handleRemoveTagFromEntity = useCallback((tag: string) => {
    const updated = removeTagFromEntity(editingEntity, tag);
    setEditingEntity(updated as ContentEntityBase);
  }, [editingEntity]);

  return (<GenericCard
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
        />
        {customEditors}
      </ColumnLayout>
    </SpaceBetween>
  </GenericCard>);
};

export default GenericEntityCreationCard;
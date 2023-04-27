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
import SpaceBetween from '@cloudscape-design/components/space-between';
import Textarea from '@cloudscape-design/components/textarea';
import { FC, useCallback, useState } from 'react';
import { ContentEntityBase } from '../../../customTypes';
import { addTagToEntity, removeTagFromEntity } from '../../../utils/entityTag';
import GenericCard from '../GenericCard';

export interface GenericEntityCreationCardProps {
  header: string;
  onSave?: (entity: ContentEntityBase) => void;
}

const GenericEntityCreationCard: FC<GenericEntityCreationCardProps> = ({
  header,
  onSave,
}) => {
  const [editingEntity, setEditingEntity] = useState<ContentEntityBase>({
    id: 'new',
    numericId: -1,
    content: '',
  });

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
    entityId='new'
    onAddTagToEntity={(_entityId, tag) => handleAddTagToEntity?.(tag)}
    onRemoveTagFromEntity={(_entityId, tag) => handleRemoveTagFromEntity?.(tag)}
  >
    <SpaceBetween direction='vertical' size='s'>
      <Textarea
        value={editingEntity.content}
        onChange={({ detail }) => setEditingEntity({
          ...editingEntity,
          content: detail.value,
        })}
      />
      <SpaceBetween direction='horizontal' size='s'>
        <Button variant='primary' onClick={() => onSave?.(editingEntity)}>Save</Button>
      </SpaceBetween>
    </SpaceBetween>
  </GenericCard>);
};

export default GenericEntityCreationCard;
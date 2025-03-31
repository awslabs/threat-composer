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
import { Mitigation, MitigationSchema, mitigationStatus } from '@aws/threat-composer-core';
import Button from '@cloudscape-design/components/button';
import ColumnLayout from '@cloudscape-design/components/column-layout';
import { OptionDefinition } from '@cloudscape-design/components/internal/components/option/interfaces';
import SpaceBetween from '@cloudscape-design/components/space-between';
import TextContent from '@cloudscape-design/components/text-content';
import { FC, useState, useCallback } from 'react';
import { MITIGATION_STATUS_COLOR_MAPPING } from '../../../configs/status';
import useEditMetadata from '../../../hooks/useEditMetadata';
import AssumptionLink from '../../assumptions/AssumptionLink';
import CopyToClipbord from '../../generic/CopyToClipboard';
import MetadataEditor from '../../generic/EntityMetadataEditor';
import GenericCard from '../../generic/GenericCard';
import StatusBadge from '../../generic/StatusBadge';
import Textarea from '../../generic/Textarea';
import MitigationThreatLink from '../MitigationThreatLink';

export interface MitigationCardProps {
  entity: Mitigation;
  onCopy?: (id: string) => void;
  onRemove?: (id: string) => void;
  onEdit?: (entity: Mitigation) => void;
  onAddTagToEntity?: (entity: Mitigation, tag: string) => void;
  onRemoveTagFromEntity?: (entity: Mitigation, tag: string) => void;
}

const MitigationCard: FC<MitigationCardProps> = ({
  entity,
  onCopy,
  onRemove,
  onEdit,
  onAddTagToEntity,
  onRemoveTagFromEntity,
}) => {
  const [editingMode, setEditingMode] = useState(false);
  const [editingValue, setEditingValue] = useState(entity.content);

  const handleSave = useCallback(() => {
    const updated = {
      ...entity,
      content: editingValue,
    };
    onEdit?.(updated);
    setEditingMode(false);
  }, [editingValue, entity, onEdit]);

  const handleCancel = useCallback(() => {
    setEditingValue(entity.content);
    setEditingMode(false);
  }, [entity]);

  const handleMetadataEdit = useEditMetadata(onEdit);

  return (<GenericCard
    header={`Mitigation ${entity.numericId}`}
    entityId={entity.id}
    tags={entity.tags}
    onCopy={() => onCopy?.(entity.id)}
    onRemove={() => onRemove?.(entity.id)}
    onEdit={() => setEditingMode(true)}
    info={<StatusBadge
      options={mitigationStatus as OptionDefinition[]}
      selectedOption={entity.status}
      setSelectedOption={(option) => onEdit?.({
        ...entity,
        status: option,
      })}
      statusColorMapping={MITIGATION_STATUS_COLOR_MAPPING}
    />}
    onAddTagToEntity={(_entityId, tag) => onAddTagToEntity?.(entity, tag)}
    onRemoveTagFromEntity={(_entityId, tag) => onRemoveTagFromEntity?.(entity, tag)}
  >
    <SpaceBetween direction='vertical' size='s'>
      <ColumnLayout columns={2}>
        {editingMode ? (
          <SpaceBetween direction='vertical' size='s'>
            <Textarea
              value={editingValue}
              onChange={({ detail }) => setEditingValue(detail.value)}
              validateData={MitigationSchema.shape.content.safeParse}
              singleLine
            />
            <SpaceBetween direction='horizontal' size='s'>
              <Button onClick={handleCancel}>Cancel</Button>
              <Button variant='primary' onClick={handleSave}>Save</Button>
            </SpaceBetween>
          </SpaceBetween>
        ) : (<TextContent>
          <CopyToClipbord>
            {entity.content || ''}
          </CopyToClipbord>
        </TextContent>)}
        <SpaceBetween direction='vertical' size='s'>
          <MitigationThreatLink mitigationId={entity.id} />
          <AssumptionLink
            linkedEntityId={entity.id}
            type='Mitigation'
          />
        </SpaceBetween>
      </ColumnLayout>
      <MetadataEditor
        variant='default'
        entity={entity}
        onEditEntity={handleMetadataEdit}
      />
    </SpaceBetween>
  </GenericCard>);
};

export default MitigationCard;
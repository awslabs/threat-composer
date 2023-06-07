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
import TextContent from '@cloudscape-design/components/text-content';
import { FC, useState, useCallback } from 'react';
import { Assumption, AssumptionSchema } from '../../../customTypes';
import useEditMetadata from '../../../hooks/useEditMetadata';
import CopyToClipbord from '../../generic/CopyToClipboard';
import MetadataEditor from '../../generic/EntityMetadataEditor';
import GenericCard from '../../generic/GenericCard';
import Textarea from '../../generic/Textarea';
import AssumptionMitigationLink from '../AssumptionMitigationLink';
import AssumptionThreatLink from '../AssumptionThreatLink';

export interface AssumptionCardProps {
  assumption: Assumption;
  onCopy?: (id: string) => void;
  onRemove?: (id: string) => void;
  onEdit?: (assumption: Assumption) => void;
  onAddTagToAssumption?: (assumption: Assumption, tag: string) => void;
  onRemoveTagFromAssumption?: (assumption: Assumption, tag: string) => void;
}

const AssumptionCard: FC<AssumptionCardProps> = ({
  assumption,
  onCopy,
  onRemove,
  onEdit,
  onAddTagToAssumption,
  onRemoveTagFromAssumption,
}) => {
  const [editingMode, setEditingMode] = useState(false);
  const [editingValue, setEditingValue] = useState(assumption.content);

  const handleSave = useCallback(() => {
    const updated = {
      ...assumption,
      content: editingValue,
    };
    onEdit?.(updated);
    setEditingMode(false);
  }, [editingValue, assumption, onEdit]);

  const handleCancel = useCallback(() => {
    setEditingValue(assumption.content);
    setEditingMode(false);
  }, [assumption]);

  const handleMetadataEdit = useEditMetadata(onEdit);

  return (<GenericCard
    header={`Assumption ${assumption.numericId}`}
    entityId={assumption.id}
    tags={assumption.tags}
    onCopy={() => onCopy?.(assumption.id)}
    onRemove={() => onRemove?.(assumption.id)}
    onEdit={() => setEditingMode(true)}
    onAddTagToEntity={(_entityId, tag) => onAddTagToAssumption?.(assumption, tag)}
    onRemoveTagFromEntity={(_entityId, tag) => onRemoveTagFromAssumption?.(assumption, tag)}
  >
    <SpaceBetween direction='vertical' size='s'>
      <ColumnLayout columns={2}>
        {editingMode ? (
          <SpaceBetween direction='vertical' size='s'>
            <Textarea
              value={editingValue}
              onChange={({ detail }) => setEditingValue(detail.value)}
              validateData={AssumptionSchema.shape.content.safeParse}
            />
            <SpaceBetween direction='horizontal' size='s'>
              <Button onClick={handleCancel}>Cancel</Button>
              <Button variant='primary' onClick={handleSave}>Save</Button>
            </SpaceBetween>
          </SpaceBetween>) : (<TextContent>
          <CopyToClipbord>
            {assumption.content || ''}
          </CopyToClipbord>
        </TextContent>)}
        <SpaceBetween direction='vertical' size='s'>
          <AssumptionThreatLink
            assumptionId={assumption.id}
          />
          <AssumptionMitigationLink
            assumptionId={assumption.id} />
        </SpaceBetween>
      </ColumnLayout>
      <MetadataEditor
        variant='default'
        entity={assumption}
        onEditEntity={handleMetadataEdit}
      />
    </SpaceBetween>
  </GenericCard>);
};

export default AssumptionCard;
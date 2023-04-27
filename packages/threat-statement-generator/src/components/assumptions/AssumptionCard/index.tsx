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
import TextContent from '@cloudscape-design/components/text-content';
import Textarea from '@cloudscape-design/components/textarea';
import { FC, useState, useCallback } from 'react';
import { Assumption } from '../../../customTypes';
import CopyToClipbord from '../../generic/CopyToClipboard';
import GenericCard from '../../generic/GenericCard';

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

  return (<GenericCard
    header={`Assumption ${assumption.numericId}`}
    entityId={assumption.id}
    onCopy={() => onCopy?.(assumption.id)}
    onRemove={() => onRemove?.(assumption.id)}
    onEdit={() => setEditingMode(true)}
    onAddTagToEntity={(_entityId, tag) => onAddTagToAssumption?.(assumption, tag)}
    onRemoveTagFromEntity={(_entityId, tag) => onRemoveTagFromAssumption?.(assumption, tag)}
  >
    {editingMode ? (
      <SpaceBetween direction='vertical' size='s'>
        <Textarea
          value={editingValue}
          onChange={({ detail }) => setEditingValue(detail.value)}
          onBlur={handleCancel}
        />
        <SpaceBetween direction='horizontal' size='s'>
          <Button onClick={handleCancel}>Cancel</Button>
          <Button variant='primary' onClick={handleSave}>Save</Button>
        </SpaceBetween>
      </SpaceBetween>
    ):
      (<TextContent>
        <CopyToClipbord>
          {assumption.content || ''}
        </CopyToClipbord>
      </TextContent>)}
  </GenericCard>);
};

export default AssumptionCard;
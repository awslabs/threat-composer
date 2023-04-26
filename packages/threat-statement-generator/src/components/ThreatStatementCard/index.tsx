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
import ButtonDropdown, { ButtonDropdownProps } from '@cloudscape-design/components/button-dropdown';
import { CancelableEventHandler } from '@cloudscape-design/components/internal/events';
import TextContent from '@cloudscape-design/components/text-content';
import { FC, useCallback, useMemo } from 'react';
import { TemplateThreatStatement } from '../../customTypes';
import CopyToClipbord from '../CopyToClipboard';
import GenericCard from '../GenericCard';

export interface ThreatStatementCardProps {
  statement: TemplateThreatStatement;
  onCopy?: (id: string) => void;
  onRemove?: (id: string) => void;
  onEditInWizard?: (id: string) => void;
  onAddTagToStatement?: (statement: TemplateThreatStatement, tag: string) => void;
  onRemoveTagFromStatement?: (statement: TemplateThreatStatement, tag: string) => void;
}

const ThreatStatementCard: FC<ThreatStatementCardProps> = ({
  statement,
  onCopy,
  onRemove,
  onEditInWizard,
  onAddTagToStatement,
  onRemoveTagFromStatement,
}) => {
  const handleMoreActions: CancelableEventHandler<ButtonDropdownProps.ItemClickDetails> = useCallback(({ detail }) => {
    switch (detail.id) {
      case 'copyToCurrentWorkspace':
        onCopy?.(statement.id);
        break;
      default:
        console.log('Unknown action', detail.id);
    }
  }, [onCopy, statement.id]);

  const moreActions = useMemo(() => {
    return (
      <ButtonDropdown
        items={[
          { id: 'copyToCurrentWorkspace', text: 'Duplicate' },
        ]}
        ariaLabel="More actions"
        variant="icon"
        onItemClick={handleMoreActions}
      />);
  }, [onCopy, onRemove, onEditInWizard, statement.id]);

  return (<GenericCard
    header={`Threat ${statement.numericId}`}
    entityId={statement.id}
    moreActions={moreActions}
    onAddTagToEntity={(_entityId, tag) => onAddTagToStatement?.(statement, tag)}
    onRemoveTagFromEntity={(_entityId, tag) => onRemoveTagFromStatement?.(statement, tag)}
  >
    <TextContent>
      <CopyToClipbord>
        {statement.statement || ''}
      </CopyToClipbord>
    </TextContent>
  </GenericCard>);
};

export default ThreatStatementCard;
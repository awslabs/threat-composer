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
import { SpaceBetween } from '@cloudscape-design/components';
import ButtonDropdown, { ButtonDropdownProps } from '@cloudscape-design/components/button-dropdown';
import ColumnLayout from '@cloudscape-design/components/column-layout';
import { CancelableEventHandler } from '@cloudscape-design/components/internal/events';
import TextContent from '@cloudscape-design/components/text-content';
import { FC, useCallback, useMemo } from 'react';
import { TemplateThreatStatement } from '../../../customTypes';
import AssumptionLink from '../../assumptions/AssumptionLink';
import CopyToClipbord from '../../generic/CopyToClipboard';
import GenericCard from '../../generic/GenericCard';
import MitigationLink from '../../mitigations/MitigationLink';
import MetadataEditor from '../MetadataEditor';
import PriorityBadge from '../PriorityBadge';

export interface ThreatStatementCardProps {
  showLinkedEntities?: boolean;
  statement: TemplateThreatStatement;
  onCopy?: (id: string) => void;
  onRemove?: (id: string) => void;
  onEditInWizard?: (id: string) => void;
  onEditMetadata: (statement: TemplateThreatStatement, key: string, value: string | string[] | undefined) => void;
  onAddTagToStatement?: (statement: TemplateThreatStatement, tag: string) => void;
  onRemoveTagFromStatement?: (statement: TemplateThreatStatement, tag: string) => void;
}

const ThreatStatementCard: FC<ThreatStatementCardProps> = ({
  showLinkedEntities,
  statement,
  onCopy,
  onRemove,
  onEditInWizard,
  onAddTagToStatement,
  onRemoveTagFromStatement,
  onEditMetadata,
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
  }, []);

  const displayStatement = useMemo(() => {
    if (statement.displayedStatement) {
      return statement.displayedStatement.map((s, index) => typeof s === 'string' ?
        s : s.type === 'b' ?
          <b key={index}>{s.content}</b> :
          s.content);
    }

    return statement.statement || '';
  }, [statement]);

  return (<GenericCard
    header={`Threat ${statement.numericId}`}
    entityId={statement.id}
    info={<PriorityBadge editingStatement={statement} onEditMetadata={onEditMetadata} />}
    tags={statement.tags}
    moreActions={moreActions}
    onRemove={onRemove}
    onEdit={onEditInWizard}
    onAddTagToEntity={(_entityId, tag) => onAddTagToStatement?.(statement, tag)}
    onRemoveTagFromEntity={(_entityId, tag) => onRemoveTagFromStatement?.(statement, tag)}
  >
    <SpaceBetween direction='vertical' size='s'>
      <ColumnLayout columns={showLinkedEntities ? 2 : 1}>
        <TextContent>
          <CopyToClipbord content={statement.statement}>
            {displayStatement}
          </CopyToClipbord>
        </TextContent>
        {showLinkedEntities && <SpaceBetween direction='vertical' size='s'>
          <AssumptionLink
            linkedEntityId={statement.id}
            type='Threat'
          />
          <MitigationLink
            linkedEntityId={statement.id}
          />
        </SpaceBetween>}
      </ColumnLayout>
      <MetadataEditor
        variant='default'
        editingStatement={statement}
        onEditMetadata={onEditMetadata}
      />
    </SpaceBetween>
  </GenericCard>);
};

export default ThreatStatementCard;
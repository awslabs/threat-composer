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
import ButtonDropdown, { ButtonDropdownProps } from '@cloudscape-design/components/button-dropdown';
import Container from '@cloudscape-design/components/container';
import Header from '@cloudscape-design/components/header';
import { CancelableEventHandler } from '@cloudscape-design/components/internal/events';
import SpaceBetween from '@cloudscape-design/components/space-between';
import TextContent from '@cloudscape-design/components/text-content';
import { FC, useCallback, useMemo, useRef } from 'react';
import Tags from './components/Tags';
import { TemplateThreatStatement } from '../../customTypes';
import CopyToClipbord from '../CopyToClipboard';

import './index.css';
import Tooltip from '../Tooltip';

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
  const ref = useRef<any>(null);

  const handleMoreActions: CancelableEventHandler<ButtonDropdownProps.ItemClickDetails> = useCallback(({ detail }) => {
    switch (detail.id) {
      case 'copyToCurrentWorkspace':
        onCopy?.(statement.id);
        break;
      default:
        console.log('Unknown action', detail.id);
    }
  }, [onCopy, statement.id]);

  const actions = useMemo(() => {
    return (<SpaceBetween direction='horizontal' size='s'>
      <Tooltip tooltip='Remove From Workspace'><Button onClick={() => onRemove?.(statement.id)} variant='icon' iconName='remove' /></Tooltip>
      <Tooltip tooltip='Edit'><Button onClick={() => onEditInWizard?.(statement.id)} variant='icon' iconName='edit' /></Tooltip>
      <ButtonDropdown
        items={[
          { id: 'copyToCurrentWorkspace', text: 'Duplicate' },
        ]}
        ariaLabel="More actions"
        variant="icon"
        onItemClick={handleMoreActions}
      />
    </SpaceBetween>);
  }, [onCopy, onRemove, onEditInWizard, statement.id]);

  return (<div ref={ref}>
    <Container
      header={<Header actions={actions}
        info={<Tags
          statement={statement}
          onAddTagToStatement={onAddTagToStatement}
          onRemoveTagFromStatement={onRemoveTagFromStatement}
        />}
      >Threat {statement.numericId}</Header>}
    >
      <TextContent>
        <CopyToClipbord>
          {statement.statement || ''}
        </CopyToClipbord>
      </TextContent>
    </Container>
  </div>);
};

export default ThreatStatementCard;
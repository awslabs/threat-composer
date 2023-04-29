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
import Container from '@cloudscape-design/components/container';
import Header from '@cloudscape-design/components/header';
import SpaceBetween from '@cloudscape-design/components/space-between';
import { FC, PropsWithChildren, useMemo, useRef, ReactNode } from 'react';
import Tags from './components/Tags';
import Tooltip from '../Tooltip';

import './index.css';

export interface GenericCardProps {
  header: string;
  entityId: string;
  tags?: string[];
  onCopy?: (id: string) => void;
  onRemove?: (id: string) => void;
  onEdit?: (id: string) => void;
  onAddTagToEntity?: (entityId: string, tag: string) => void;
  onRemoveTagFromEntity?: (entityId: string, tag: string) => void;
  moreActions?: ReactNode;
}

const GenericCard: FC<PropsWithChildren<GenericCardProps>> = ({
  header,
  entityId,
  tags,
  children,
  onRemove,
  onEdit,
  onAddTagToEntity,
  onRemoveTagFromEntity,
  moreActions,
}) => {
  const ref = useRef<any>(null);

  const actions = useMemo(() => {
    return (<SpaceBetween direction='horizontal' size='s'>
      {onRemove && <Tooltip tooltip='Remove From Workspace'><Button onClick={() => onRemove?.(entityId)} variant='icon' iconName='remove' /></Tooltip>}
      {onEdit && <Tooltip tooltip='Edit'><Button onClick={() => onEdit?.(entityId)} variant='icon' iconName='edit' /></Tooltip>}
      {moreActions}
    </SpaceBetween>);
  }, [onRemove, onEdit, entityId]);

  return (<div ref={ref}>
    <Container
      header={<Header actions={actions}
        info={<Tags
          tags={tags}
          entityId={entityId}
          onAddTagToEntity={onAddTagToEntity}
          onRemoveTagFromEntity={onRemoveTagFromEntity}
        />}
      >{header}</Header>}
    >
      {children}
    </Container>
  </div>);
};

export default GenericCard;
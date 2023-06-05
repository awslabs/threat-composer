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
import { DeleteConfirmationDialog } from '@aws-northstar/ui';
import Button from '@cloudscape-design/components/button';
import Container from '@cloudscape-design/components/container';
import Header from '@cloudscape-design/components/header';
import SpaceBetween from '@cloudscape-design/components/space-between';
import * as awsui from '@cloudscape-design/design-tokens';
import { css } from '@emotion/react';
import { FC, PropsWithChildren, useMemo, useRef, ReactNode, useState } from 'react';
import Tags from './components/Tags';
import getMobileMediaQuery from '../../../utils/getMobileMediaQuery';
import Tooltip from '../Tooltip';

export interface GenericCardProps {
  header: string;
  info?: ReactNode;
  entityId: string;
  tags?: string[];
  onCopy?: (id: string) => void;
  onRemove?: (id: string) => void;
  onEdit?: (id: string) => void;
  onAddTagToEntity?: (entityId: string, tag: string) => void;
  onRemoveTagFromEntity?: (entityId: string, tag: string) => void;
  moreActions?: ReactNode;
}

const styles = {
  header: css({
    display: 'inline-flex',
    alignItems: 'center',
    [getMobileMediaQuery()]: {
      display: 'block',
      marginTop: awsui.spaceScaledS,
    },
  }),
  tags: css({
    marginRight: awsui.spaceScaledS,
    marginLeft: awsui.spaceScaledS,
    [getMobileMediaQuery()]: {
      marginLeft: '0px',
    },
  }),
  info: css({
    marginLeft: awsui.spaceScaledS,
    [getMobileMediaQuery()]: {
      marginLeft: '0px',
    },
  }),
};

const GenericCard: FC<PropsWithChildren<GenericCardProps>> = ({
  header,
  info,
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
  const [removeDialogVisible, setRemoveDialogVisible] = useState(false);

  const actions = useMemo(() => {
    return (<SpaceBetween direction='horizontal' size='s'>
      {onRemove && <Tooltip tooltip='Remove From Workspace'><Button onClick={() => setRemoveDialogVisible(true)} variant='icon' iconName='remove' /></Tooltip>}
      {onEdit && <Tooltip tooltip='Edit'><Button onClick={() => onEdit?.(entityId)} variant='icon' iconName='edit' /></Tooltip>}
      {moreActions}
    </SpaceBetween>);
  }, [onRemove, onEdit, entityId]);

  return (<div ref={ref}>
    <Container
      header={<Header actions={actions}
      ><div css={styles.header}>
          {header}
          <div css={styles.info}>{info}</div>
          <div css={styles.tags}><Tags
            tags={tags}
            entityId={entityId}
            onAddTagToEntity={onAddTagToEntity}
            onRemoveTagFromEntity={onRemoveTagFromEntity}
          /></div>
        </div></Header>}
    >
      {children}
    </Container>
    {removeDialogVisible && <DeleteConfirmationDialog
      variant='confirmation'
      title={`Remove ${header}?`}
      visible={removeDialogVisible}
      onCancelClicked={() => setRemoveDialogVisible(false)}
      onDeleteClicked={() => onRemove?.(entityId)}
      deleteButtonText='Remove'
    ></DeleteConfirmationDialog>}
  </div>);
};

export default GenericCard;
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
import Badge, { BadgeProps } from '@cloudscape-design/components/badge';
import Button from '@cloudscape-design/components/button';
import Link from '@cloudscape-design/components/link';
import * as awsui from '@cloudscape-design/design-tokens';
import { css } from '@emotion/react';
import { FC, ReactNode, useId } from 'react';
import { METADATA_KEY_COMMENTS } from '../../../configs/metadata';

const styles = {
  listItem: css({
    listStyle: 'none',
  }),
  item: css({
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: awsui.spaceScaledXs,
    padding: `${awsui.spaceScaledXxs} ${awsui.spaceScaledXs}`,
    marginTop: awsui.spaceScaledXs,
    border: `1px solid ${awsui.colorBorderDividerDefault}`,
    borderRadius: awsui.borderRadiusItem,
  }),
  body: css({
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: awsui.spaceScaledXs,
    minWidth: 0,
    overflowWrap: 'anywhere',
  }),
};

/**
 * The text of the entity's "Comments" metadata, if any. Used as the hover text of a linked entity
 * so that it adds information instead of repeating the content that is already displayed.
 */
export const getEntityComments = (entity: { metadata?: ReadonlyArray<{ key: string; value: unknown }> }): string | undefined => {
  const comments = entity.metadata?.find(m => m.key === METADATA_KEY_COMMENTS)?.value;
  return typeof comments === 'string' && comments.trim() ? comments : undefined;
};

export interface LinkedEntityStatusProps {
  status?: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  colorMapping: { [status: string]: BadgeProps['color'] };
}

/**
 * A read-only status badge. It has the same label and colour as the badge on the entity's own card.
 */
export const LinkedEntityStatus: FC<LinkedEntityStatusProps> = ({ status, options, colorMapping }) => (
  <Badge color={colorMapping[status || 'NotSet'] || 'grey'}>
    {(status && options.find(o => o.value === status)?.label) || 'Status Not Set'}
  </Badge>
);

export interface LinkedEntityItemProps {
  /** The displayed id, e.g. M-0015. */
  displayId: string;
  content: string;
  status?: ReactNode;
  /** Shown as a tooltip on hover. */
  comments?: string;
  /** When set, the id is a link that calls this. */
  onNavigate?: () => void;
  dismissLabel: string;
  onDismiss: () => void;
  /** The number of items in the list this item belongs to. Set by LinkedEntityList. */
  setSize?: number;
  /** The 1-based position of this item in the list. Set by LinkedEntityList. */
  position?: number;
}

const LinkedEntityItem: FC<LinkedEntityItemProps> = ({
  displayId,
  content,
  status,
  comments,
  onNavigate,
  dismissLabel,
  onDismiss,
  setSize,
  position,
}) => {
  const idElementId = useId();
  const contentElementId = useId();
  // The item is a group named by its id and content, so a screen reader announces them
  // when focus enters the item, and "N of M" comes from the surrounding list.
  return (<li css={styles.listItem} aria-setsize={setSize} aria-posinset={position}>
    <div css={styles.item} role='group' aria-labelledby={`${idElementId} ${contentElementId}`}>
      <div css={styles.body} title={comments}>
        <span id={idElementId}>
          {onNavigate ? (<Link
            href='#'
            variant='secondary'
            onFollow={(event) => {
              event.preventDefault();
              onNavigate();
            }}
          >{displayId}</Link>) : <b>{displayId}</b>}
        </span>
        {status}
        <span id={contentElementId}>{content}</span>
      </div>
      <Button
        variant='icon'
        iconName='close'
        ariaLabel={dismissLabel}
        onClick={onDismiss}
      />
    </div>
  </li>);
};

export default LinkedEntityItem;

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
import Button from '@cloudscape-design/components/button';
import { CancelableEventHandler, BaseKeyDetail } from '@cloudscape-design/components/internal/events';
import TokenGroup from '@cloudscape-design/components/token-group';
import * as awsui from '@cloudscape-design/design-tokens';
import { css } from '@emotion/react';
import { FC, useCallback, useState } from 'react';
import { TagSchema } from '../../../../../customTypes';
import { useMobileMediaQuery } from '../../../../../hooks/useMediaQuery';
import getMobileMediaQuery from '../../../../../utils/getMobileMediaQuery';
import Input from '../../../../generic/Input';

export interface TagsProps {
  tags?: string[];
  entityId: string;
  onAddTagToEntity?: (entityId: string, tag: string) => void;
  onRemoveTagFromEntity?: (entityId: string, tag: string) => void;
}

const styles = {
  tags: css({
    '&>div': {
      display: 'inline-block',
    },
  }),
  input: css({
    marginLeft: awsui.spaceScaledS,
    [getMobileMediaQuery()]: {
      marginLeft: '0px',
      marginTop: awsui.spaceScaledS,
    },
  }),
};

const Tags: FC<TagsProps> = ({
  tags,
  entityId,
  onAddTagToEntity,
  onRemoveTagFromEntity,
}) => {
  const [value, setValue] = useState('');
  const isMoblieView = useMobileMediaQuery();

  const handleKeyDown: CancelableEventHandler<BaseKeyDetail> = useCallback(({ detail }) => {
    if (detail.keyCode === 13 && value) {
      onAddTagToEntity?.(entityId, value);
      setValue('');
    }
  }, [onAddTagToEntity, entityId, value]);

  const handleAddTag = useCallback(() => {
    onAddTagToEntity?.(entityId, value);
    setValue('');
  }, [onAddTagToEntity, entityId, value]);

  return (<div css={styles.tags}>
    {tags && tags.length > 0 && <TokenGroup
      onDismiss={({ detail: { itemIndex } }) => {
        tags && onRemoveTagFromEntity?.(entityId, tags?.[itemIndex]);
      }}
      items={tags.map(t => ({
        label: t,
        dismissLabel: `Remove ${t}`,
      }))}
    />}
    <div css={styles.input}>
      <Input value={value}
        onKeyDown={handleKeyDown}
        onChange={({ detail }) => setValue(detail.value)}
        validateData={TagSchema.safeParse}
        secondaryControl={isMoblieView ? <Button onClick={handleAddTag}>Add Tag</Button> : undefined}
        placeholder='Add tag' />
    </div>
  </div>);
};

export default Tags;
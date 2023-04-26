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
import Input from '@cloudscape-design/components/input';
import { CancelableEventHandler, BaseKeyDetail } from '@cloudscape-design/components/internal/events';
import TokenGroup from '@cloudscape-design/components/token-group';
import { FC, useCallback, useState } from 'react';

export interface TagsProps {
  tags?: string[];
  entityId: string;
  onAddTagToEntity?: (entityId: string, tag: string) => void;
  onRemoveTagFromEntity?: (entityId: string, tag: string) => void;
}

const Tags: FC<TagsProps> = ({
  tags,
  entityId,
  onAddTagToEntity,
  onRemoveTagFromEntity,
}) => {
  const [value, setValue] = useState('');

  const handleKeyDown: CancelableEventHandler<BaseKeyDetail> = useCallback(({ detail }) => {
    if (detail.keyCode === 13) {
      onAddTagToEntity?.(entityId, value);
      setValue('');
    }
  }, [onAddTagToEntity, entityId, value]);

  return (<div className='threat-statement-editor-statement-list-card-tags'>
    {tags && tags.length > 0 && <TokenGroup
      onDismiss={({ detail: { itemIndex } }) => {
        tags && onRemoveTagFromEntity?.(entityId, tags?.[itemIndex]);
      }}
      items={tags.map(t => ({
        label: t,
        dismissLabel: `Remove ${t}`,
      }))}
    />}
    <Input value={value}
      onKeyDown={handleKeyDown}
      onChange={({ detail }) => setValue(detail.value)}
      placeholder='Add tag' />
  </div>);
};

export default Tags;
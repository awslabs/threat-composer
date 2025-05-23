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
import Grid from '@cloudscape-design/components/grid';
import Input from '@cloudscape-design/components/input';
import SpaceBetween from '@cloudscape-design/components/space-between';
import TextContent from '@cloudscape-design/components/text-content';
import * as awsui from '@cloudscape-design/design-tokens';
import { css } from '@emotion/react';
import { useCallback, useMemo, useState } from 'react';
import { PerFieldExample } from '../../../customTypes';

export const DEFAULT_NUM_DISPLAY = 5;

const styles = {
  list: css({
    '& button': {
      padding: `0px ${awsui.spaceStaticXxs} !important`,
    },
  }),
};

export interface PreviousInputListProps<T> {
  items: T[];
  onSelect: (item: string) => void;
  showSearch?: boolean;
}

const PreviousInputList = <T extends string | PerFieldExample>({
  items,
  onSelect,
  showSearch = true,
}: PreviousInputListProps<T>) => {
  const [showMoreItems, setShowMoreItems] = useState(false);
  const [filterText, setFilterText] = useState('');

  const filteredItems = useMemo(() => {
    if (!filterText) {
      return items;
    }

    return items.filter(item => {
      if (typeof item === 'string') {
        return item.toLowerCase().includes(filterText.toLowerCase());
      }

      return (item as PerFieldExample).example.toLowerCase().includes(filterText.toLowerCase());
    });
  }, [items, filterText]);

  const renderItem = useCallback((item: T) => {
    if (typeof item === 'string') {
      return (
        <Button variant='link' onClick={() => onSelect(item)}>
          {item}
        </Button>
      );
    }

    const perFieldExample = item as PerFieldExample;
    return (
      <Button variant='link' onClick={() => onSelect(perFieldExample.example)}>
        {perFieldExample.example}
      </Button>
    );
  }, [onSelect]);

  return (
    <TextContent>
      <SpaceBetween direction='vertical' size='m'>
        <span>From previous input</span>
        {showSearch && (
          <Grid gridDefinition={[{ colspan: { default: 12, xxs: 6 } }]}>
            <Input
              value={filterText}
              onChange={({ detail }) => setFilterText(detail.value)}
              placeholder='Search previous inputs'
            />
          </Grid>
        )}
        <ul>
          {filteredItems
            .slice(0, showMoreItems ? undefined : DEFAULT_NUM_DISPLAY)
            .map((item, index) => (
              <li key={index} css={styles.list}>
                {renderItem(item)}
              </li>
            ))}
        </ul>
        {filteredItems.length > DEFAULT_NUM_DISPLAY && (
          <Button
            iconName={showMoreItems ? 'treeview-collapse' : 'treeview-expand'}
            onClick={() => setShowMoreItems(prev => !prev)}
            variant='link'
          >
            {showMoreItems ? 'Show less items' : 'Show more items'}
          </Button>
        )}
      </SpaceBetween>
    </TextContent>
  );
};

export default PreviousInputList;

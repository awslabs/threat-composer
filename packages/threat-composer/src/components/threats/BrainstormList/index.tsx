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
import { useMemo, useState } from 'react';
import { BrainstormItem } from '../../../contexts/BrainstormContext/types';

export const DEFAULT_NUM_DISPLAY = 5;

const styles = {
  list: css({
    '& button': {
      padding: `0px ${awsui.spaceStaticXxs} !important`,
    },
  }),
};

export interface BrainstormListProps {
  items: BrainstormItem[];
  onSelect: (content: string) => void;
  showSearch?: boolean;
}

const BrainstormList: React.FC<BrainstormListProps> = ({
  items,
  onSelect,
  showSearch = true,
}) => {
  const [showMoreItems, setShowMoreItems] = useState(false);
  const [filterText, setFilterText] = useState('');

  const filteredItems = useMemo(() => {
    if (!filterText) {
      return items;
    }

    return items.filter(item =>
      item.content.toLowerCase().includes(filterText.toLowerCase()),
    );
  }, [items, filterText]);

  return (
    <TextContent>
      <SpaceBetween direction='vertical' size='m'>
        <span>From brainstorm</span>
        {showSearch && (
          <Grid gridDefinition={[{ colspan: { default: 12, xxs: 6 } }]}>
            <Input
              value={filterText}
              onChange={({ detail }) => setFilterText(detail.value)}
              placeholder='Search brainstorm items'
            />
          </Grid>
        )}
        <ul>
          {filteredItems
            .slice(0, showMoreItems ? undefined : DEFAULT_NUM_DISPLAY)
            .map((item, index) => (
              <li key={index} css={styles.list}>
                <Button variant='link' onClick={() => onSelect(item.content)}>
                  {item.content}
                </Button>
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

export default BrainstormList;

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
import SpaceBetween from '@cloudscape-design/components/space-between';
import { FC, useCallback, useState, useMemo } from 'react';
import { useBrainstormContext } from '../../../../../contexts/BrainstormContext';
import { PromotionHandlers, ThreatCreationHandlers } from '../../../../../contexts/BrainstormContext/types';
import { BrainstormItem, BrainstormData } from '../../../../../customTypes/brainstorm';
import GroupableItemCard from '../../../../generic/GroupableItemCard';
import EntityCreationCard from '../EntityCreationCard';

// Export column configuration for use by parent components
export { columnConfig, ColumnConfig, getThreatInputColumns, getPromotableColumns, getThreatCreationColumns, getColumnById } from './columnConfig';

export interface ItemColumnProps {
  title: string;
  itemType: keyof BrainstormData;
  placeholder: string;
  description: string;
  icon: string;
  isPromotable?: boolean;
  onPromote?: PromotionHandlers;
  canCreateThreat?: boolean;
  onCreateThreat?: ThreatCreationHandlers;
}

const ItemColumn: FC<ItemColumnProps> = ({
  itemType,
  placeholder,
  isPromotable = false,
  onPromote,
  canCreateThreat = false,
  onCreateThreat,
}) => {
  const { brainstormData, addItem, updateItem, removeItem, ungroupItem, mergeGroups } = useBrainstormContext();
  const [content, setContent] = useState('');

  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
  }, []);

  const handleSave = useCallback(() => {
    if (content.trim()) {
      addItem(itemType, content.trim());
      setContent('');
    }
  }, [content, itemType, addItem]);

  const handleUpdate = useCallback((updatedItem: BrainstormItem) => {
    updateItem(itemType, updatedItem.id, updatedItem.content);
  }, [itemType, updateItem]);

  const handleGroup = useCallback((sourceId: string, targetId: string) => {
    mergeGroups(itemType, sourceId, targetId);
  }, [mergeGroups, itemType]);

  const handleUngroup = useCallback((id: string) => {
    ungroupItem(itemType, id);
  }, [ungroupItem, itemType]);

  // Create display items logic - group items by groupId and sort by creation time
  const displayItems = useMemo(() => {
    const items = brainstormData[itemType] || [];
    const groupMap = new Map<string, BrainstormItem[]>();
    const individualItems: BrainstormItem[] = [];

    // Group items by groupId
    items.forEach(item => {
      if (item.groupId) {
        if (!groupMap.has(item.groupId)) {
          groupMap.set(item.groupId, []);
        }
        groupMap.get(item.groupId)!.push(item);
      } else {
        individualItems.push(item);
      }
    });

    // Sort items within each group by creation time
    groupMap.forEach(itemsInGroup => {
      itemsInGroup.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    });

    // Create display items
    const result: Array<{ item: BrainstormItem; groupedItems: BrainstormItem[] }> = [];

    // Add individual items
    individualItems.forEach(item => {
      result.push({ item, groupedItems: [] });
    });

    // Add groups represented by their earliest item
    groupMap.forEach(itemsInGroup => {
      if (itemsInGroup.length > 0) {
        result.push({ item: itemsInGroup[0], groupedItems: itemsInGroup });
      }
    });

    // Sort by creation time
    result.sort((a, b) => new Date(a.item.createdAt).getTime() - new Date(b.item.createdAt).getTime());

    return result;
  }, [brainstormData, itemType]);

  return (
    <SpaceBetween direction="vertical" size="s">
      <EntityCreationCard
        header=""
        content={content}
        onContentChange={handleContentChange}
        onSave={handleSave}
        placeholder={placeholder}
        disabled={!content.trim()}
      />
      {displayItems.map(({ item, groupedItems }) => (
        <GroupableItemCard
          key={item.id}
          item={item}
          itemType={itemType}
          onDelete={(id: string) => removeItem(itemType, id)}
          onUpdate={handleUpdate}
          isPromotable={isPromotable}
          onPromote={onPromote}
          canCreateThreat={canCreateThreat}
          onCreateThreat={onCreateThreat}
          groupedItems={groupedItems}
          onGroup={handleGroup}
          onUngroup={handleUngroup}
        />
      ))}
    </SpaceBetween>
  );
};

export default ItemColumn;
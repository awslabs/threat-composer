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
import { useCallback } from 'react';
import { BrainstormData, BrainstormItem } from '../../customTypes/brainstorm';

const initialState: BrainstormData = {
  assumptions: [],
  threatSources: [],
  threatPrerequisites: [],
  threatActions: [],
  threatImpacts: [],
  assets: [],
  mitigations: [],
};

const useBrainstorm = (
  brainstormData: BrainstormData,
  setBrainstormData: (data: BrainstormData) => void,
) => {
  const addItem = useCallback((type: keyof BrainstormData, content: string) => {
    setBrainstormData({
      ...brainstormData,
      [type]: [
        ...(brainstormData[type] || []),
        {
          id: crypto.randomUUID(),
          content,
          createdAt: new Date().toISOString(),
          createdBy: undefined, // Will be set by the application when known
        },
      ],
    });
  }, [brainstormData, setBrainstormData]);

  const updateItem = useCallback((type: keyof BrainstormData, id: string, content: string) => {
    setBrainstormData({
      ...brainstormData,
      [type]: (brainstormData[type] || []).map((item: BrainstormItem) =>
        item.id === id ? { ...item, content } : item,
      ),
    });
  }, [brainstormData, setBrainstormData]);

  const removeItem = useCallback((type: keyof BrainstormData, id: string) => {
    setBrainstormData({
      ...brainstormData,
      [type]: (brainstormData[type] || []).filter((item: BrainstormItem) => item.id !== id),
    });
  }, [brainstormData, setBrainstormData]);

  const groupItems = useCallback((type: keyof BrainstormData, sourceId: string, targetId: string) => {
    const items = brainstormData[type] || [];
    const sourceItem = items.find(item => item.id === sourceId);
    const targetItem = items.find(item => item.id === targetId);

    if (!sourceItem || !targetItem || sourceId === targetId) {
      return;
    }

    // Determine the target group ID
    let targetGroupId: string;

    if (targetItem.groupId) {
      // Target is part of a group, use its group ID
      targetGroupId = targetItem.groupId;
    } else if (sourceItem.groupId) {
      // Source is part of a group, target is individual - use source's group ID
      targetGroupId = sourceItem.groupId;
    } else {
      // Both are individual items, create new group
      targetGroupId = crypto.randomUUID();
    }

    setBrainstormData({
      ...brainstormData,
      [type]: items.map((currentItem: BrainstormItem) => {
        // If source item is part of a group, merge all items from source group into target group
        if (sourceItem.groupId && currentItem.groupId === sourceItem.groupId) {
          return {
            ...currentItem,
            groupId: targetGroupId,
          };
        } else if (currentItem.id === targetId && !currentItem.groupId) {
          // If target item is individual, add it to the group
          return {
            ...currentItem,
            groupId: targetGroupId,
          };
        } else if (currentItem.id === sourceId && !currentItem.groupId) {
          // If source item is individual, add it to the target group
          return {
            ...currentItem,
            groupId: targetGroupId,
          };
        }
        return currentItem;
      }),
    });
  }, [brainstormData, setBrainstormData]);

  const ungroupItem = useCallback((type: keyof BrainstormData, id: string) => {
    const items = brainstormData[type] || [];
    const targetItem = items.find(item => item.id === id);

    if (!targetItem || !targetItem.groupId) {
      return;
    }

    const groupId = targetItem.groupId;
    const itemsInGroup = items.filter(item => item.groupId === groupId);

    setBrainstormData({
      ...brainstormData,
      [type]: items.map((currentItem: BrainstormItem) => {
        if (currentItem.id === id) {
          // Remove grouping info from this item
          const { groupId: _, ...ungroupedItem } = currentItem;
          return ungroupedItem;
        } else if (currentItem.groupId === groupId && itemsInGroup.length === 2) {
          // If removing this item leaves only one item in the group, ungroup the remaining item too
          const { groupId: __, ...ungroupedItem } = currentItem;
          return ungroupedItem;
        }
        return currentItem;
      }),
    });
  }, [brainstormData, setBrainstormData]);

  const getGroupedItems = useCallback((type: keyof BrainstormData, groupId: string) => {
    const items = brainstormData[type] || [];
    return items.filter(item => item.groupId === groupId);
  }, [brainstormData]);

  // Get display items with proper grouping and ordering
  const getDisplayItems = useCallback((type: keyof BrainstormData) => {
    const items = brainstormData[type] || [];
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

    // Create display items with proper ordering
    const result: Array<{ item: BrainstormItem; groupedItems: BrainstormItem[]; earliestCreatedAt: Date }> = [];

    // Add individual items with their creation time
    individualItems.forEach(item => {
      result.push({
        item,
        groupedItems: [],
        earliestCreatedAt: new Date(item.createdAt),
      });
    });

    // Add groups represented by their earliest item
    groupMap.forEach(itemsInGroup => {
      if (itemsInGroup.length > 0) {
        const earliestItem = itemsInGroup[0]; // Already sorted by creation time
        result.push({
          item: earliestItem,
          groupedItems: itemsInGroup,
          earliestCreatedAt: new Date(earliestItem.createdAt),
        });
      }
    });

    // Sort all display items by their earliest creation time to maintain original order
    result.sort((a, b) => a.earliestCreatedAt.getTime() - b.earliestCreatedAt.getTime());

    return result.map(({ item, groupedItems }) => ({ item, groupedItems }));
  }, [brainstormData]);

  // Alias for backward compatibility
  const mergeGroups = groupItems;

  return {
    addItem,
    updateItem,
    removeItem,
    groupItems,
    ungroupItem,
    getGroupedItems,
    getDisplayItems,
    mergeGroups,
  };
};

export default useBrainstorm;
export { initialState };

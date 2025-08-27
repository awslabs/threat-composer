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

    // Generate a new group ID if target item is not already grouped
    const groupId = targetItem.groupId || crypto.randomUUID();

    setBrainstormData({
      ...brainstormData,
      [type]: items.map((currentItem: BrainstormItem) => {
        if (currentItem.id === sourceId) {
          // Add source item to the group
          return {
            ...currentItem,
            groupId,
          };
        } else if (currentItem.id === targetId && !currentItem.groupId) {
          // Add target item to the group if it wasn't already grouped
          return {
            ...currentItem,
            groupId,
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

    setBrainstormData({
      ...brainstormData,
      [type]: items.map((currentItem: BrainstormItem) => {
        if (currentItem.id === id) {
          // Remove grouping info from this item
          const { groupId, ...ungroupedItem } = currentItem;
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

  const mergeGroups = useCallback((type: keyof BrainstormData, sourceId: string, targetId: string) => {
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

  return {
    addItem,
    updateItem,
    removeItem,
    groupItems,
    ungroupItem,
    getGroupedItems,
    mergeGroups,
  };
};

export default useBrainstorm;
export { initialState };

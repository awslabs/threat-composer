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
import SpaceBetween from '@cloudscape-design/components/space-between';
import TextContent from '@cloudscape-design/components/text-content';
import Textarea from '@cloudscape-design/components/textarea';
import { colorBorderDividerDefault, colorBackgroundButtonPrimaryActive } from '@cloudscape-design/design-tokens';
import { FC, useCallback, useState, useRef, useEffect, DragEvent } from 'react';
import { PromotionHandlers, ThreatCreationHandlers } from '../../../contexts/BrainstormContext/types';
import { BrainstormItem, BrainstormData } from '../../../customTypes/brainstorm';

// Item Card Component
interface GroupableItemCardProps {
  item: BrainstormItem;
  itemType: keyof BrainstormData;
  onDelete: (id: string) => void;
  onUpdate: (item: BrainstormItem) => void;
  onPromote?: PromotionHandlers;
  isPromotable?: boolean;
  onCreateThreat?: ThreatCreationHandlers;
  canCreateThreat?: boolean;
  groupedItems?: BrainstormItem[];
  onGroup?: (sourceId: string, targetId: string) => void;
  onUngroup?: (id: string) => void;
  isSelected?: boolean;
  onSelect?: (item: BrainstormItem) => void;
}

// Module-level variable to store current drag data
let currentDragData: { itemId: string; itemType: keyof BrainstormData } | null = null;

const GroupableItemCard: FC<GroupableItemCardProps> = ({
  item,
  itemType,
  onDelete,
  onUpdate,
  onPromote,
  isPromotable = false,
  onCreateThreat,
  canCreateThreat = false,
  groupedItems = [],
  onGroup,
  onUngroup,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isDropTarget, setIsDropTarget] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const isGrouped = groupedItems.length > 1;

  // Check if any item in this card is being edited
  const isAnyItemBeingEdited = editingItemId !== null;

  const handleMouseEnter = useCallback(() => {
    // Mouse enter handling for drag/drop container
    // Individual items handle their own button visibility
  }, []);

  const handleMouseLeave = useCallback(() => {
    // Mouse leave handling for drag/drop container
    // Individual items handle their own button visibility
  }, []);

  const handleDragStart = useCallback((e: DragEvent<HTMLDivElement>) => {
    setIsDragging(true);
    const dragData = {
      itemId: item.id,
      itemType,
    };
    currentDragData = dragData;
    e.dataTransfer.setData('text/plain', JSON.stringify(dragData));
    e.dataTransfer.effectAllowed = 'move';
  }, [item.id, itemType]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    setIsDropTarget(false);
    currentDragData = null;
  }, []);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDragEnter = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();

    // Only show drop target feedback if the dragged item type matches this item's type
    if (currentDragData && currentDragData.itemType === itemType && currentDragData.itemId !== item.id) {
      setIsDropTarget(true);
    }
  }, [itemType, item.id]);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    // Only hide drop target if we're actually leaving the card
    if (cardRef.current && !cardRef.current.contains(e.relatedTarget as Node)) {
      setIsDropTarget(false);
    }
  }, []);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDropTarget(false);

    try {
      const dragData = JSON.parse(e.dataTransfer.getData('text/plain'));
      if (dragData.itemType === itemType && dragData.itemId !== item.id && onGroup) {
        onGroup(dragData.itemId, item.id);
      }
    } catch {
      // Invalid drag data
    }
  }, [item.id, itemType, onGroup]);

  const handleUngroupItem = useCallback((ungroupItemId: string) => {
    if (onUngroup) {
      onUngroup(ungroupItemId);
    }
  }, [onUngroup]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // Individual item component with its own state
  const ItemContent: FC<{ brainstormItem: BrainstormItem; showUngroupButton?: boolean }> = ({
    brainstormItem,
    showUngroupButton = false,
  }) => {
    const [itemShowButtons, setItemShowButtons] = useState(false);
    const [localEditContent, setLocalEditContent] = useState('');

    const handleItemMouseEnter = useCallback(() => {
      setItemShowButtons(true);
    }, []);

    const handleItemMouseLeave = useCallback(() => {
      setItemShowButtons(false);
    }, []);

    // Check if this specific item is being edited
    const isThisItemBeingEdited = editingItemId === brainstormItem.id;

    // Initialize content when editing starts
    useEffect(() => {
      if (isThisItemBeingEdited) {
        setLocalEditContent(brainstormItem.content || '');
      }
    }, [isThisItemBeingEdited, brainstormItem.content]);

    const handleStartEdit = useCallback(() => {
      setEditingItemId(brainstormItem.id);
      setLocalEditContent(brainstormItem.content || '');
    }, [brainstormItem.id, brainstormItem.content]);

    const handleSaveEdit = useCallback(() => {
      if (localEditContent.trim()) {
        onUpdate({
          ...brainstormItem,
          content: localEditContent.trim(),
        });
      }
      setEditingItemId(null);
      setLocalEditContent('');
    }, [brainstormItem, localEditContent, onUpdate]);

    const handleCancelEdit = useCallback(() => {
      setEditingItemId(null);
      setLocalEditContent('');
    }, []);

    // If this item is being edited, show the edit UI
    if (isThisItemBeingEdited) {
      return (
        <SpaceBetween direction="vertical" size="s">
          <Textarea
            placeholder="Edit content..."
            value={localEditContent}
            onChange={({ detail }) => setLocalEditContent(detail.value)}
            rows={3}
            autoFocus
          />
          <SpaceBetween direction="horizontal" size="s">
            <Button onClick={handleCancelEdit}>Cancel</Button>
            <Button
              variant="primary"
              disabled={!localEditContent.trim()}
              onClick={handleSaveEdit}
            >
              Save
            </Button>
          </SpaceBetween>
        </SpaceBetween>
      );
    }

    // Otherwise, show the normal item view
    return (
      <div
        onMouseEnter={handleItemMouseEnter}
        onMouseLeave={handleItemMouseLeave}
      >
        <SpaceBetween direction="vertical" size="s">
          <TextContent>{brainstormItem.content}</TextContent>
          {itemShowButtons && (
            <div style={{ marginTop: '8px' }}>
              <SpaceBetween direction="horizontal" size="xs">
                {isPromotable && (
                  <Button
                    iconName={onPromote && onPromote.isPromoted?.(brainstormItem) ? 'check' : 'add-plus'}
                    variant="icon"
                    onClick={() => onPromote && onPromote.promote?.(brainstormItem)}
                    disabled={onPromote && onPromote.isPromoted?.(brainstormItem)}
                    ariaLabel={onPromote && onPromote.isPromoted?.(brainstormItem) ? 'Item promoted' : 'Promote item'}
                  />
                )}
                {canCreateThreat && (
                  <Button
                    iconName="external"
                    variant="icon"
                    onClick={() => onCreateThreat && onCreateThreat.createThreat?.(brainstormItem)}
                    ariaLabel={`Create threat with ${onCreateThreat?.fieldName}`}
                  />
                )}
                {showUngroupButton && (
                  <Button
                    iconName="undo"
                    variant="icon"
                    onClick={() => handleUngroupItem(brainstormItem.id)}
                    ariaLabel="Remove from group"
                  />
                )}
                <Button
                  iconName="edit"
                  variant="icon"
                  onClick={handleStartEdit}
                  disabled={isPromotable && onPromote && onPromote.isPromoted?.(brainstormItem)}
                  ariaLabel="Edit item"
                />
                <Button
                  iconName="remove"
                  variant="icon"
                  onClick={() => onDelete(brainstormItem.id)}
                  ariaLabel="Delete item"
                />
              </SpaceBetween>
            </div>
          )}
        </SpaceBetween>
      </div>
    );
  };

  const containerStyle = {
    opacity: isDragging ? 0.6 : 1,
    transform: isDragging ? 'rotate(2deg)' : (isDropTarget ? 'rotate(2deg)' : 'none'),
    transition: 'all 0.2s ease',
  };

  if (isGrouped) {
    // Render as stacked container with multiple items
    return (
      <div
        ref={cardRef}
        draggable={!isAnyItemBeingEdited}
        onDragStart={!isAnyItemBeingEdited ? handleDragStart : undefined}
        onDragEnd={!isAnyItemBeingEdited ? handleDragEnd : undefined}
        onDragOver={!isAnyItemBeingEdited ? handleDragOver : undefined}
        onDragEnter={!isAnyItemBeingEdited ? handleDragEnter : undefined}
        onDragLeave={!isAnyItemBeingEdited ? handleDragLeave : undefined}
        onDrop={!isAnyItemBeingEdited ? handleDrop : undefined}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={containerStyle}
      >
        <Container variant="stacked">
          {groupedItems.map((groupedItem, index) => (
            <div key={groupedItem.id}>
              {index > 0 && (
                <div style={{
                  height: '1px',
                  backgroundColor: colorBorderDividerDefault,
                  margin: '12px 0',
                  width: '100%',
                }} />
              )}
              <ItemContent
                brainstormItem={groupedItem}
                showUngroupButton={true} // Show ungroup button on all items in a group
              />
            </div>
          ))}
        </Container>

        {isDropTarget && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: colorBackgroundButtonPrimaryActive,
            color: 'white',
            padding: '6px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 500,
            zIndex: 10,
            textAlign: 'center',
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
          }}>
            Drop to group with {groupedItems.length} item{groupedItems.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    );
  }

  // Render as individual container
  return (
    <div
      ref={cardRef}
      draggable={!isAnyItemBeingEdited}
      onDragStart={!isAnyItemBeingEdited ? handleDragStart : undefined}
      onDragEnd={!isAnyItemBeingEdited ? handleDragEnd : undefined}
      onDragOver={!isAnyItemBeingEdited ? handleDragOver : undefined}
      onDragEnter={!isAnyItemBeingEdited ? handleDragEnter : undefined}
      onDragLeave={!isAnyItemBeingEdited ? handleDragLeave : undefined}
      onDrop={!isAnyItemBeingEdited ? handleDrop : undefined}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={containerStyle}
    >
      <Container>
        <ItemContent brainstormItem={item} />
      </Container>

      {isDropTarget && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: colorBackgroundButtonPrimaryActive,
          color: 'white',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '11px',
          fontWeight: 500,
          zIndex: 10,
        }}>
          Drop here to group
        </div>
      )}
    </div>
  );
};

export default GroupableItemCard;

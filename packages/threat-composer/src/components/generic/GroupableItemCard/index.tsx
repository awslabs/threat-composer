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
import { FC, useCallback, useState, useRef, useEffect, DragEvent } from 'react';
import { BrainstormItem, BrainstormData } from '../../../customTypes/brainstorm';

// Item Card Component
interface GroupableItemCardProps {
  item: BrainstormItem;
  itemType: keyof BrainstormData;
  onDelete: (id: string) => void;
  onEdit: (item: BrainstormItem) => void;
  onPromote?: PromotionHandlers;
  isPromotable?: boolean;
  onCreateThreat?: ThreatCreationHandlers;
  canCreateThreat?: boolean;
  groupedItems?: BrainstormItem[];
  onGroup?: (sourceId: string, targetId: string) => void;
  onUngroup?: (id: string) => void;
  isSelected?: boolean;
  onSelect?: (item: BrainstormItem) => void;
  // Inline editing props
  editingItem?: BrainstormItem | null;
  onEditContentChange?: (content: string) => void;
  onSaveEdit?: () => void;
  onCancelEdit?: () => void;
}

// Promotion handlers interface
interface PromotionHandlers {
  promote: (item: BrainstormItem) => void;
  isPromoted: (item: BrainstormItem) => boolean;
}

// Threat creation handlers interface
interface ThreatCreationHandlers {
  createThreat: (item: BrainstormItem) => void;
  fieldName: string;
  fieldKey: string;
}

const GroupableItemCard: FC<GroupableItemCardProps> = ({
  item,
  itemType,
  onDelete,
  onEdit,
  onPromote,
  isPromotable = false,
  onCreateThreat,
  canCreateThreat = false,
  groupedItems = [],
  onGroup,
  onUngroup,
  editingItem,
  onEditContentChange,
  onSaveEdit,
  onCancelEdit,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isDropTarget, setIsDropTarget] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const isGrouped = groupedItems.length > 1;

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
    e.dataTransfer.setData('text/plain', JSON.stringify(dragData));
    e.dataTransfer.effectAllowed = 'move';
  }, [item.id, itemType]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    setIsDropTarget(false);
  }, []);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDragEnter = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    // For now, assume all drags are valid and show the tilt
    // We'll validate on drop
    setIsDropTarget(true);
  }, []);

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
    const itemHoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleItemMouseEnter = useCallback(() => {
      if (itemHoverTimeoutRef.current) {
        clearTimeout(itemHoverTimeoutRef.current);
      }
      itemHoverTimeoutRef.current = setTimeout(() => {
        setItemShowButtons(true);
      }, 100);
    }, []);

    const handleItemMouseLeave = useCallback(() => {
      if (itemHoverTimeoutRef.current) {
        clearTimeout(itemHoverTimeoutRef.current);
      }
      itemHoverTimeoutRef.current = setTimeout(() => {
        setItemShowButtons(false);
      }, 100);
    }, []);

    useEffect(() => {
      return () => {
        if (itemHoverTimeoutRef.current) {
          clearTimeout(itemHoverTimeoutRef.current);
        }
      };
    }, []);

    // Check if this specific item is being edited
    const isThisItemBeingEdited = editingItem && editingItem.id === brainstormItem.id;

    // If this item is being edited, show the edit UI
    if (isThisItemBeingEdited) {
      return (
        <SpaceBetween direction="vertical" size="s">
          <Textarea
            placeholder="Edit content..."
            value={editingItem.content}
            onChange={({ detail }) => onEditContentChange?.(detail.value)}
            rows={3}
          />
          <SpaceBetween direction="horizontal" size="s">
            <Button onClick={onCancelEdit}>Cancel</Button>
            <Button
              variant="primary"
              disabled={!editingItem.content.trim()}
              onClick={onSaveEdit}
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
                  onClick={() => onEdit(brainstormItem)}
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
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
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
                  backgroundColor: '#e9ebed',
                  margin: '12px 0',
                  width: '100%',
                }} />
              )}
              <ItemContent
                brainstormItem={groupedItem}
                showUngroupButton={index > 0} // Don't show ungroup button on first item
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
            backgroundColor: 'rgba(9, 114, 211, 0.9)',
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
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
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
          backgroundColor: 'rgba(9, 114, 211, 0.9)',
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

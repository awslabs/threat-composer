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
import {
  useArchitectureInfoContext,
  useDataflowInfoContext,
  useAssumptionsContext,
  useMitigationsContext,
  useWorkspacesContext,
} from '@aws/threat-composer';
import Modal from '@aws/threat-composer/lib/components/generic/Modal';
import BrainstormContextProvider, { useBrainstormContext, BrainstormItem } from '@aws/threat-composer/lib/contexts/BrainstormContext';
import { Button, Container, ContentLayout, Header, SpaceBetween, TextContent, Input, Toggle, Textarea } from '@cloudscape-design/components';
import { BaseKeyDetail } from '@cloudscape-design/components/internal/events';
import { FC, useCallback, useState, CSSProperties, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';


// Item Card Component
interface ItemCardProps {
  item: BrainstormItem;
  onDelete: (id: string) => void;
  onEdit: (item: BrainstormItem) => void;
  onPromote?: PromotionHandlers;
  isPromotable?: boolean;
  onCreateThreat?: ThreatCreationHandlers;
  canCreateThreat?: boolean;
  isSelected?: boolean;
  onSelect?: (item: BrainstormItem) => void;
}

const ItemCard: FC<ItemCardProps> = ({
  item,
  onDelete,
  onEdit,
  onPromote,
  isPromotable = false,
  onCreateThreat,
  canCreateThreat = false,
}) => {
  const [showButtons, setShowButtons] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setShowButtons(true);
    }, 100); // 100ms delay before showing buttons
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setShowButtons(false);
    }, 100); // 100ms delay before hiding buttons
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Container>
        <SpaceBetween direction="vertical" size="s">
          <TextContent>{item.content}</TextContent>
          {showButtons && (
            <div style={{ marginTop: '8px' }}>
              <SpaceBetween direction="horizontal" size="xs">
                {isPromotable && (
                  <Button
                    iconName={onPromote && onPromote.isPromoted?.(item) ? 'check' : 'add-plus'}
                    variant="icon"
                    onClick={() => onPromote && onPromote.promote?.(item)}
                    disabled={onPromote && onPromote.isPromoted?.(item)}
                    ariaLabel={onPromote && onPromote.isPromoted?.(item) ? 'Item promoted' : 'Promote item'}
                  />
                )}
                {canCreateThreat && (
                  <Button
                    iconName="external"
                    variant="icon"
                    onClick={() => onCreateThreat && onCreateThreat.createThreat?.(item)}
                    ariaLabel={`Create threat with ${onCreateThreat?.fieldName}`}
                  />
                )}
                <Button
                  iconName="edit"
                  variant="icon"
                  onClick={() => onEdit(item)}
                  disabled={isPromotable && onPromote && onPromote.isPromoted?.(item)}
                  ariaLabel="Edit item"
                />
                <Button iconName="remove" variant="icon" onClick={() => onDelete(item.id)} />
              </SpaceBetween>
            </div>
          )}
        </SpaceBetween>
      </Container>
    </div>
  );
};

// Entity Creation Card Component
const SimplifiedEntityCreationCard: FC<{
  header: string;
  content: string;
  onContentChange: (content: string) => void;
  onSave: () => void;
  onReset: () => void;
  placeholder?: string;
  disabled?: boolean;
  buttonText?: string;
}> = ({
  header,
  content,
  onContentChange,
  onSave,
  onReset,
  placeholder,
  disabled,
  buttonText = 'Add',
}) => {
  const handleKeyDown = useCallback((event: CustomEvent<BaseKeyDetail>) => {
    if (event.detail.key === 'Enter' && content.trim() && !disabled) {
      event.preventDefault();
      onSave();
    }
  }, [content, onSave, disabled]);

  // For edit mode, show both Cancel and Save buttons with no header
  if (buttonText === 'Save') {
    return (
      <Container>
        <SpaceBetween direction="vertical" size="s">
          <Textarea
            placeholder={placeholder || 'Enter content...'}
            value={content}
            onChange={({ detail }) => onContentChange(detail.value)}
            rows={3}
          />
          <SpaceBetween direction="horizontal" size="s">
            <Button onClick={onReset}>Cancel</Button>
            <Button variant="primary" disabled={disabled || !content.trim()} onClick={onSave}>{buttonText}</Button>
          </SpaceBetween>
        </SpaceBetween>
      </Container>
    );
  }

  // For create mode, no buttons, just the input with helper text
  return (
    <Container header={<Header>{header}</Header>}>
      <SpaceBetween direction="vertical" size="s">
        <Input
          placeholder={placeholder || 'Enter content...'}
          value={content}
          onChange={({ detail }) => onContentChange(detail.value)}
          onKeyDown={handleKeyDown}
        />
        <TextContent>
          <small><i>Press enter to add...</i></small>
        </TextContent>
      </SpaceBetween>
    </Container>
  );
};

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

// Generic Column Component
interface ItemColumnProps {
  title: string;
  itemType: 'assumptions' | 'threatSources' | 'threatPrerequisites' | 'threatActions' | 'threatImpacts' | 'assets' | 'mitigations';
  placeholder: string;
  isPromotable?: boolean;
  onPromote?: PromotionHandlers;
  canCreateThreat?: boolean;
  onCreateThreat?: ThreatCreationHandlers;
}

const ItemColumn: FC<ItemColumnProps> = ({
  title, itemType, placeholder, isPromotable = false,
  onPromote, canCreateThreat = false, onCreateThreat,
}) => {
  const { brainstormData, addItem, updateItem, removeItem } = useBrainstormContext();
  const [content, setContent] = useState('');
  const [editingItem, setEditingItem] = useState<BrainstormItem | null>(null);

  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
  }, []);

  const handleEditContentChange = useCallback((newContent: string) => {
    if (editingItem) {
      setEditingItem({
        ...editingItem,
        content: newContent,
      });
    }
  }, [editingItem]);

  const handleSave = useCallback(() => {
    if (content.trim()) {
      addItem(itemType, content.trim());
      setContent('');
    }
  }, [content, itemType, addItem]);

  const handleReset = useCallback(() => {
    setContent('');
  }, []);

  const handleEdit = useCallback((item: BrainstormItem) => {
    setEditingItem(item);
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (editingItem && editingItem.content.trim()) {
      updateItem(itemType, editingItem.id, editingItem.content);
      setEditingItem(null);
    }
  }, [editingItem, itemType, updateItem]);

  const handleCancelEdit = useCallback(() => {
    setEditingItem(null);
  }, []);

  return (
    <SpaceBetween direction="vertical" size="s">
      <SimplifiedEntityCreationCard
        header=""
        content={content}
        onContentChange={handleContentChange}
        onSave={handleSave}
        onReset={handleReset}
        placeholder={placeholder}
        disabled={!content.trim()}
      />
      {brainstormData[itemType].map((item: BrainstormItem) => (
        editingItem && editingItem.id === item.id ? (
          <SimplifiedEntityCreationCard
            key={item.id}
            header={`Edit ${title}`}
            content={editingItem.content}
            onContentChange={handleEditContentChange}
            onSave={handleSaveEdit}
            onReset={handleCancelEdit}
            placeholder={`Edit ${placeholder}`}
            disabled={!editingItem.content.trim()}
            buttonText="Save"
          />
        ) : (
          <ItemCard
            key={item.id}
            item={item}
            onDelete={(id) => removeItem(itemType, id)}
            onEdit={handleEdit}
            isPromotable={isPromotable}
            onPromote={onPromote}
            canCreateThreat={canCreateThreat}
            onCreateThreat={onCreateThreat}
          />
        )
      ))}
    </SpaceBetween>
  );
};

// Image Modal Component with Zoom and Pan
const DiagramModal: FC<{
  visible: boolean;
  onDismiss: () => void;
  title: string;
  image?: string;
}> = ({
  visible,
  onDismiss,
  title,
  image,
}) => {
  const [zoomLevel, setZoomLevel] = useState(100);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const containerStyles: CSSProperties = {
    color: 'white',
    transition: 'all 0.3s ease',
  };

  const imageContainerStyles: CSSProperties = {
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
    height: '500px',
    margin: '0 auto',
  };

  const imageStyles: CSSProperties = {
    position: 'absolute',
    transform: `scale(${zoomLevel / 100}) translate(${panPosition.x}px, ${panPosition.y}px)`,
    transformOrigin: 'center center',
    transition: isDragging ? 'none' : 'transform 0.2s ease',
    cursor: zoomLevel > 100 ? 'move' : 'default',
    maxWidth: '100%',
    maxHeight: '100%',
    display: 'block',
    margin: '0 auto',
  };

  const headerStyles: CSSProperties = {
    marginBottom: '16px',
  };

  const controlsStyles: CSSProperties = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: '16px',
    gap: '10px',
  };

  const sliderContainerStyles: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    minWidth: '200px',
  };

  const resetZoomAndPan = () => {
    setZoomLevel(100);
    setPanPosition({ x: 0, y: 0 });
  };

  const handleZoomChange = (value: number) => {
    setZoomLevel(value);
    // Reset pan position when zooming back to 100%
    if (value === 100) {
      setPanPosition({ x: 0, y: 0 });
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLImageElement>) => {
    if (zoomLevel > 100) {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLImageElement>) => {
    if (isDragging && zoomLevel > 100) {
      const dx = (e.clientX - dragStart.x) / (zoomLevel / 100);
      const dy = (e.clientY - dragStart.y) / (zoomLevel / 100);
      setPanPosition({
        x: panPosition.x + dx,
        y: panPosition.y + dy,
      });
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  return (
    <Modal
      visible={visible}
      onDismiss={onDismiss}
    >
      <div style={containerStyles}>
        <div style={headerStyles}>
          <Header variant="h2">{title}</Header>
        </div>
        {image && (
          <div style={controlsStyles}>
            <div style={sliderContainerStyles}>
              <span>Zoom:</span>
              <input
                type="range"
                min="100"
                max="400"
                step="10"
                value={zoomLevel}
                onChange={(e) => handleZoomChange(parseInt(e.target.value, 10))}
                style={{ width: '100%' }}
              />
              <span>{zoomLevel}%</span>
            </div>
            <Button
              iconName="undo"
              onClick={resetZoomAndPan}
              ariaLabel="Reset Zoom"
            >
              Reset
            </Button>
          </div>
        )}
        {image ? (
          <div style={imageContainerStyles}>
            <img
              src={image}
              alt={title}
              style={imageStyles}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
            />
          </div>
        ) : (
          <p>No diagram available</p>
        )}
      </div>
    </Modal>
  );
};

// Define column configuration
const columnConfig = [
  {
    id: 'assumptions',
    title: 'Assumptions',
    defaultVisible: true,
    description: 'Design or security assumptions that may impact threat analysis',
  },
  {
    id: 'threatSources',
    title: 'Threat Sources',
    defaultVisible: true,
    description: 'Actors or entities that could pose security threats',
  },
  {
    id: 'threatPrerequisites',
    title: 'Prerequisites',
    defaultVisible: true,
    description: 'Conditions required for a threat to be viable',
  },
  {
    id: 'threatActions',
    title: 'Threat Actions',
    defaultVisible: true,
    description: 'Activities performed by threat sources to exploit vulnerabilities',
  },
  {
    id: 'threatImpacts',
    title: 'Threat Impacts',
    defaultVisible: true,
    description: 'Immediate consequences if threat actions succeed',
  },
  {
    id: 'assets',
    title: 'Assets',
    defaultVisible: true,
    description: 'Valuable resources that require protection',
  },
  {
    id: 'mitigations',
    title: 'Mitigations',
    defaultVisible: true,
    description: 'Measures to reduce threat likelihood or impact',
  },
];

// Inner BrainstormBoard Component
const BrainstormBoardInner: FC = () => {
  const { architectureInfo } = useArchitectureInfoContext();
  const { dataflowInfo } = useDataflowInfoContext();
  const { saveAssumption, assumptionList } = useAssumptionsContext();
  const { saveMitigation, mitigationList } = useMitigationsContext();
  const { currentWorkspace } = useWorkspacesContext();
  const navigate = useNavigate();
  const [showArchitectureModal, setShowArchitectureModal] = useState(false);
  const [showDataflowModal, setShowDataflowModal] = useState(false);

  // Create state for column visibility
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(
    columnConfig.reduce((acc, col) => ({ ...acc, [col.id]: col.defaultVisible }), {}),
  );

  // Create state for threat inputs master toggle
  const [threatInputsVisible, setThreatInputsVisible] = useState(true);

  // Check if an assumption is already promoted
  const isAssumptionPromoted = useCallback((item: BrainstormItem) => {
    return assumptionList.some(assumption => assumption.id === item.id);
  }, [assumptionList]);

  // Handle promoting an assumption
  const promoteAssumption = useCallback((item: BrainstormItem) => {
    if (!isAssumptionPromoted(item)) {
      // Create a new assumption with the same ID
      const newAssumption = {
        id: item.id,
        numericId: assumptionList.length + 1,
        content: item.content,
      };

      saveAssumption(newAssumption);
    }
  }, [assumptionList, saveAssumption, isAssumptionPromoted]);

  // Check if a mitigation is already promoted
  const isMitigationPromoted = useCallback((item: BrainstormItem) => {
    return mitigationList.some(mitigation => mitigation.id === item.id);
  }, [mitigationList]);

  // Handle promoting a mitigation
  const promoteMitigation = useCallback((item: BrainstormItem) => {
    if (!isMitigationPromoted(item)) {
      // Create a new mitigation with the same ID
      const newMitigation = {
        id: item.id,
        numericId: mitigationList.length + 1,
        content: item.content,
      };

      saveMitigation(newMitigation);
    }
  }, [mitigationList, saveMitigation, isMitigationPromoted]);

  // Create promotion handlers for assumptions
  const assumptionPromotionHandlers: PromotionHandlers = {
    promote: promoteAssumption,
    isPromoted: isAssumptionPromoted,
  };

  // Create promotion handlers for mitigations
  const mitigationPromotionHandlers: PromotionHandlers = {
    promote: promoteMitigation,
    isPromoted: isMitigationPromoted,
  };

  // Create a threat with a threat source
  const createThreatWithSource = useCallback((item: BrainstormItem) => {
    // Navigate to the threat editor with the threat source as a URL parameter
    const params = `fieldKey=threatSource&fieldValue=${encodeURIComponent(item.content)}`;
    navigate(`/workspaces/${currentWorkspace?.name || 'default'}/threats/${item.id}?${params}`);
  }, [navigate, currentWorkspace]);

  // Create threat source handlers
  const threatSourceHandlers: ThreatCreationHandlers = {
    createThreat: createThreatWithSource,
    fieldName: 'Threat Source',
    fieldKey: 'threatSource',
  };

  // Create a threat with a prerequisite
  const createThreatWithPrerequisite = useCallback((item: BrainstormItem) => {
    // Navigate to the threat editor with the prerequisite as a URL parameter
    const params = `fieldKey=prerequisites&fieldValue=${encodeURIComponent(item.content)}`;
    navigate(`/workspaces/${currentWorkspace?.name || 'default'}/threats/${item.id}?${params}`);
  }, [navigate, currentWorkspace]);

  // Create prerequisite handlers
  const prerequisiteHandlers: ThreatCreationHandlers = {
    createThreat: createThreatWithPrerequisite,
    fieldName: 'Prerequisite',
    fieldKey: 'prerequisites',
  };

  // Create a threat with a threat action
  const createThreatWithAction = useCallback((item: BrainstormItem) => {
    // Navigate to the threat editor with the threat action as a URL parameter
    const params = `fieldKey=threatAction&fieldValue=${encodeURIComponent(item.content)}`;
    navigate(`/workspaces/${currentWorkspace?.name || 'default'}/threats/${item.id}?${params}`);
  }, [navigate, currentWorkspace]);

  // Create threat action handlers
  const threatActionHandlers: ThreatCreationHandlers = {
    createThreat: createThreatWithAction,
    fieldName: 'Threat Action',
    fieldKey: 'threatAction',
  };

  // Create a threat with a threat impact
  const createThreatWithImpact = useCallback((item: BrainstormItem) => {
    // Navigate to the threat editor with the threat impact as a URL parameter
    const params = `fieldKey=threatImpact&fieldValue=${encodeURIComponent(item.content)}`;
    navigate(`/workspaces/${currentWorkspace?.name || 'default'}/threats/${item.id}?${params}`);
  }, [navigate, currentWorkspace]);

  // Create threat impact handlers
  const threatImpactHandlers: ThreatCreationHandlers = {
    createThreat: createThreatWithImpact,
    fieldName: 'Threat Impact',
    fieldKey: 'threatImpact',
  };

  // Create a threat with an asset
  const createThreatWithAsset = useCallback((item: BrainstormItem) => {
    // Navigate to the threat editor with the asset as a URL parameter
    const params = `fieldKey=impactedAssets&fieldValue=${encodeURIComponent(item.content)}`;
    navigate(`/workspaces/${currentWorkspace?.name || 'default'}/threats/${item.id}?${params}`);
  }, [navigate, currentWorkspace]);

  // Create asset handlers
  const assetHandlers: ThreatCreationHandlers = {
    createThreat: createThreatWithAsset,
    fieldName: 'Asset',
    fieldKey: 'impactedAssets',
  };

  // Create column visibility toggles
  const columnVisibilityToggles = (
    <Container>
      <SpaceBetween direction="horizontal" size="xs">
        <Toggle
          checked={visibleColumns.assumptions}
          onChange={({ detail }) =>
            setVisibleColumns(prev => ({ ...prev, assumptions: detail.checked }))
          }
        >
          Assumptions
        </Toggle>
        <Toggle
          checked={threatInputsVisible}
          onChange={({ detail }) => setThreatInputsVisible(detail.checked)}
        >
          Threat Inputs
        </Toggle>
        <Toggle
          checked={visibleColumns.mitigations}
          onChange={({ detail }) =>
            setVisibleColumns(prev => ({ ...prev, mitigations: detail.checked }))
          }
        >
          Mitigations
        </Toggle>
      </SpaceBetween>
    </Container>
  );

  // No need to calculate the number of visible columns anymore

  return (
    <ContentLayout
      headerVariant='high-contrast'
      header={
        <Header
          variant="h1"
          actions={
            <SpaceBetween direction="horizontal" size="xs">
              <Button onClick={() => setShowArchitectureModal(true)}>Architecture Diagram</Button>
              <Button onClick={() => setShowDataflowModal(true)}>Data Flow Diagram</Button>
            </SpaceBetween>
          }
          description="Quickly capture ideas, then selectively add or use them in to your threat model"
        >
          Brainstorm
        </Header>
      }
    >
      <SpaceBetween direction="vertical" size="m">
        {columnVisibilityToggles}
        <div style={{
          overflowX: 'auto',
          width: '100%',
          paddingBottom: '8px', // Space for the scrollbar
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'row',
            gap: '20px',
            width: 'fit-content', // Allow container to grow based on content
          }}>
            {visibleColumns.assumptions && (
              <div style={{ width: '300px', flexShrink: 0 }}>
                <Container header={
                  <div>
                    <Header variant="h2">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Button iconName="status-info" variant="icon" disabled />
                        Assumptions
                      </div>
                    </Header>
                    <TextContent>
                      <small><i>{columnConfig.find(c => c.id === 'assumptions')?.description}</i></small>
                    </TextContent>
                  </div>
                }>
                  <ItemColumn
                    title="Assumption"
                    itemType="assumptions"
                    placeholder="Add an assumption..."
                    isPromotable={true}
                    onPromote={assumptionPromotionHandlers}
                  />
                </Container>
              </div>
            )}
            {threatInputsVisible && (
              <div style={{ width: '300px', flexShrink: 0 }}>
                <Container header={
                  <div>
                    <Header variant="h2">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Button iconName="user-profile" variant="icon" disabled />
                        Threat sources
                      </div>
                    </Header>
                    <TextContent>
                      <small><i>{columnConfig.find(c => c.id === 'threatSources')?.description}</i></small>
                    </TextContent>
                  </div>
                }>
                  <ItemColumn
                    title="Threat Source"
                    itemType="threatSources"
                    placeholder="Add a threat source..."
                    canCreateThreat={true}
                    onCreateThreat={threatSourceHandlers}
                  />
                </Container>
              </div>
            )}
            {threatInputsVisible && (
              <div style={{ width: '300px', flexShrink: 0 }}>
                <Container header={
                  <div>
                    <Header variant="h2">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Button iconName="settings" variant="icon" disabled />
                        Threat prerequisites
                      </div>
                    </Header>
                    <TextContent>
                      <small><i>{columnConfig.find(c => c.id === 'threatPrerequisites')?.description}</i></small>
                    </TextContent>
                  </div>
                }>
                  <ItemColumn
                    title="Threat Prerequisite"
                    itemType="threatPrerequisites"
                    placeholder="Add a prerequisite..."
                    canCreateThreat={true}
                    onCreateThreat={prerequisiteHandlers}
                  />
                </Container>
              </div>
            )}
            {threatInputsVisible && (
              <div style={{ width: '300px', flexShrink: 0 }}>
                <Container header={
                  <div>
                    <Header variant="h2">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Button iconName="arrow-right" variant="icon" disabled />
                        Threat actions
                      </div>
                    </Header>
                    <TextContent>
                      <small><i>{columnConfig.find(c => c.id === 'threatActions')?.description}</i></small>
                    </TextContent>
                  </div>
                }>
                  <ItemColumn
                    title="Threat Action"
                    itemType="threatActions"
                    placeholder="Add a threat action..."
                    canCreateThreat={true}
                    onCreateThreat={threatActionHandlers}
                  />
                </Container>
              </div>
            )}
            {threatInputsVisible && (
              <div style={{ width: '300px', flexShrink: 0 }}>
                <Container header={
                  <div>
                    <Header variant="h2">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Button iconName="status-negative" variant="icon" disabled />
                        Threat impacts
                      </div>
                    </Header>
                    <TextContent>
                      <small><i>{columnConfig.find(c => c.id === 'threatImpacts')?.description}</i></small>
                    </TextContent>
                  </div>
                }>
                  <ItemColumn
                    title="Threat Impact"
                    itemType="threatImpacts"
                    placeholder="Add a threat impact..."
                    canCreateThreat={true}
                    onCreateThreat={threatImpactHandlers}
                  />
                </Container>
              </div>
            )}
            {threatInputsVisible && (
              <div style={{ width: '300px', flexShrink: 0 }}>
                <Container header={
                  <div>
                    <Header variant="h2">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Button iconName="folder" variant="icon" disabled />
                        Assets
                      </div>
                    </Header>
                    <TextContent>
                      <small><i>{columnConfig.find(c => c.id === 'assets')?.description}</i></small>
                    </TextContent>
                  </div>
                }>
                  <ItemColumn
                    title="Asset"
                    itemType="assets"
                    placeholder="Add an asset..."
                    canCreateThreat={true}
                    onCreateThreat={assetHandlers}
                  />
                </Container>
              </div>
            )}
            {visibleColumns.mitigations && (
              <div style={{ width: '300px', flexShrink: 0 }}>
                <Container header={
                  <div>
                    <Header variant="h2">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Button iconName="status-positive" variant="icon" disabled />
                        Mitigations
                      </div>
                    </Header>
                    <TextContent>
                      <small><i>{columnConfig.find(c => c.id === 'mitigations')?.description}</i></small>
                    </TextContent>
                  </div>
                }>
                  <ItemColumn
                    title="Mitigation"
                    itemType="mitigations"
                    placeholder="Add a mitigation..."
                    isPromotable={true}
                    onPromote={mitigationPromotionHandlers}
                  />
                </Container>
              </div>
            )}
          </div>
        </div>
      </SpaceBetween>
      <DiagramModal
        visible={showArchitectureModal}
        onDismiss={() => setShowArchitectureModal(false)}
        title="Architecture Diagram"
        image={architectureInfo.image}
      />
      <DiagramModal
        visible={showDataflowModal}
        onDismiss={() => setShowDataflowModal(false)}
        title="Data Flow Diagram"
        image={dataflowInfo.image}
      />
    </ContentLayout>
  );
};

// Main BrainstormBoard Component with Provider
const BrainstormBoard: FC = () => {
  const { currentWorkspace } = useWorkspacesContext();

  return (
    <BrainstormContextProvider workspaceId={currentWorkspace?.id || null}>
      <BrainstormBoardInner />
    </BrainstormContextProvider>
  );
};

export default BrainstormBoard;

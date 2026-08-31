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
import { Button, Container, ContentLayout, Header, SpaceBetween, TextContent } from '@cloudscape-design/components';
import { FC, useCallback, useState } from 'react';
// Navigation will be handled via props instead of direct router dependency
import ColumnVisibilityToggles from './components/ColumnVisibilityToggles';
import DiagramModal from './components/DiagramModal';
import ItemColumn, { columnConfig } from './components/ItemColumn';
import { useArchitectureInfoContext } from '../../../contexts/ArchitectureContext';
import { useAssumptionsContext } from '../../../contexts/AssumptionsContext';
import BrainstormContextProvider from '../../../contexts/BrainstormContext';
import { PromotionHandlers, ThreatCreationHandlers } from '../../../contexts/BrainstormContext/types';
import { useDataflowInfoContext } from '../../../contexts/DataflowContext';
import { useMitigationsContext } from '../../../contexts/MitigationsContext';
import { useWorkspacesContext } from '../../../contexts/WorkspacesContext';
import { BrainstormItem } from '../../../customTypes/brainstorm';

/**
 * Navigation handler for creating threats with specific field values
 */
export type NavigateToThreatHandler = (workspaceName: string, itemId: string, fieldKey: string, fieldValue: string) => void;

/**
 * Props interface for BrainstormBoard component
 */
export interface BrainstormBoardProps {
  /**
   * Handler for navigating to threat creation with pre-filled field values
   */
  onNavigateToThreat?: NavigateToThreatHandler;
}

/**
 * Inner BrainstormBoard component that contains the main logic
 * This component assumes it's wrapped in BrainstormContextProvider
 */
const BrainstormBoardInner: FC<{ onNavigateToThreat?: NavigateToThreatHandler }> = ({ onNavigateToThreat }) => {
  const { architectureInfo } = useArchitectureInfoContext();
  const { dataflowInfo } = useDataflowInfoContext();
  const { saveAssumption, assumptionList } = useAssumptionsContext();
  const { saveMitigation, mitigationList } = useMitigationsContext();
  const { currentWorkspace } = useWorkspacesContext();

  // Modal state management
  const [showArchitectureModal, setShowArchitectureModal] = useState(false);
  const [showDataflowModal, setShowDataflowModal] = useState(false);

  // Column visibility state management
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(
    columnConfig.reduce((acc, col) => ({ ...acc, [col.id]: col.defaultVisible }), {}),
  );

  // Threat inputs master toggle state
  const [threatInputsVisible, setThreatInputsVisible] = useState(true);

  // Handle individual column visibility changes
  const handleColumnVisibilityChange = useCallback((columnId: string, visible: boolean) => {
    setVisibleColumns(prev => ({ ...prev, [columnId]: visible }));
  }, []);

  // Handle threat inputs group visibility changes
  const handleThreatInputsVisibilityChange = useCallback((visible: boolean) => {
    setThreatInputsVisible(visible);
  }, []);

  // Assumption promotion handlers
  const isAssumptionPromoted = useCallback((item: BrainstormItem) => {
    return assumptionList.some(assumption => assumption.id === item.id);
  }, [assumptionList]);

  const promoteAssumption = useCallback((item: BrainstormItem) => {
    if (!isAssumptionPromoted(item)) {
      const newAssumption = {
        id: item.id,
        numericId: assumptionList.length + 1,
        content: item.content,
      };
      saveAssumption(newAssumption);
    }
  }, [assumptionList, saveAssumption, isAssumptionPromoted]);

  const assumptionPromotionHandlers: PromotionHandlers = {
    promote: promoteAssumption,
    isPromoted: isAssumptionPromoted,
  };

  // Mitigation promotion handlers
  const isMitigationPromoted = useCallback((item: BrainstormItem) => {
    return mitigationList.some(mitigation => mitigation.id === item.id);
  }, [mitigationList]);

  const promoteMitigation = useCallback((item: BrainstormItem) => {
    if (!isMitigationPromoted(item)) {
      const newMitigation = {
        id: item.id,
        numericId: mitigationList.length + 1,
        content: item.content,
      };
      saveMitigation(newMitigation);
    }
  }, [mitigationList, saveMitigation, isMitigationPromoted]);

  const mitigationPromotionHandlers: PromotionHandlers = {
    promote: promoteMitigation,
    isPromoted: isMitigationPromoted,
  };

  // Threat creation handlers
  const createThreatWithField = useCallback((item: BrainstormItem, fieldKey: string) => {
    if (onNavigateToThreat) {
      onNavigateToThreat(currentWorkspace?.name || 'default', item.id, fieldKey, item.content);
    }
  }, [onNavigateToThreat, currentWorkspace]);

  const threatSourceHandlers: ThreatCreationHandlers = {
    createThreat: (item: BrainstormItem) => createThreatWithField(item, 'threatSource'),
    fieldName: 'Threat Source',
    fieldKey: 'threatSource',
  };

  const prerequisiteHandlers: ThreatCreationHandlers = {
    createThreat: (item: BrainstormItem) => createThreatWithField(item, 'prerequisites'),
    fieldName: 'Prerequisite',
    fieldKey: 'prerequisites',
  };

  const threatActionHandlers: ThreatCreationHandlers = {
    createThreat: (item: BrainstormItem) => createThreatWithField(item, 'threatAction'),
    fieldName: 'Threat Action',
    fieldKey: 'threatAction',
  };

  const threatImpactHandlers: ThreatCreationHandlers = {
    createThreat: (item: BrainstormItem) => createThreatWithField(item, 'threatImpact'),
    fieldName: 'Threat Impact',
    fieldKey: 'threatImpact',
  };

  const assetHandlers: ThreatCreationHandlers = {
    createThreat: (item: BrainstormItem) => createThreatWithField(item, 'impactedAssets'),
    fieldName: 'Asset',
    fieldKey: 'impactedAssets',
  };

  // Get handlers for each column type
  const getHandlersForColumn = (columnId: string) => {
    switch (columnId) {
      case 'assumptions':
        return { promotionHandlers: assumptionPromotionHandlers };
      case 'mitigations':
        return { promotionHandlers: mitigationPromotionHandlers };
      case 'threatSources':
        return { threatCreationHandlers: threatSourceHandlers };
      case 'threatPrerequisites':
        return { threatCreationHandlers: prerequisiteHandlers };
      case 'threatActions':
        return { threatCreationHandlers: threatActionHandlers };
      case 'threatImpacts':
        return { threatCreationHandlers: threatImpactHandlers };
      case 'assets':
        return { threatCreationHandlers: assetHandlers };
      default:
        return {};
    }
  };

  // Render a column based on configuration
  const renderColumn = (config: any) => {
    const { promotionHandlers, threatCreationHandlers } = getHandlersForColumn(config.id);

    return (
      <div key={config.id} style={{ width: '300px', flexShrink: 0 }}>
        <Container header={
          <div>
            <Header variant="h2">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Button iconName={config.icon} variant="icon" disabled />
                {config.title}
              </div>
            </Header>
            <TextContent>
              <small><i>{config.description}</i></small>
            </TextContent>
          </div>
        }>
          <ItemColumn
            title={config.title}
            itemType={config.id}
            placeholder={`Add ${config.title.toLowerCase().slice(0, -1)}...`}
            description={config.description}
            icon={config.icon}
            isPromotable={config.isPromotable}
            onPromote={promotionHandlers}
            canCreateThreat={config.canCreateThreat}
            onCreateThreat={threatCreationHandlers}
          />
        </Container>
      </div>
    );
  };

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
        <ColumnVisibilityToggles
          visibleColumns={visibleColumns}
          onColumnVisibilityChange={handleColumnVisibilityChange}
          threatInputsVisible={threatInputsVisible}
          onThreatInputsVisibilityChange={handleThreatInputsVisibilityChange}
        />
        <div style={{
          overflowX: 'auto',
          width: '100%',
          paddingBottom: '8px', // Space for the scrollbar
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '20px',
            width: '100%',
          }}>
            {columnConfig.map(column => {
              // Show assumptions and mitigations based on individual visibility
              if (column.id === 'assumptions' || column.id === 'mitigations') {
                return visibleColumns[column.id] ? renderColumn(column) : null;
              }
              // Show threat input columns based on master toggle
              if (column.isThreatInput) {
                return threatInputsVisible ? renderColumn(column) : null;
              }
              return null;
            })}
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

/**
 * Main BrainstormBoard component with BrainstormContextProvider wrapper
 *
 * This component orchestrates all extracted components and provides the main
 * brainstorming interface with column visibility management, promotion handlers,
 * and threat creation functionality.
 */
export const BrainstormBoard: FC<BrainstormBoardProps> = ({ onNavigateToThreat }) => {
  const { currentWorkspace } = useWorkspacesContext();

  return (
    <BrainstormContextProvider workspaceId={currentWorkspace?.id || null}>
      <BrainstormBoardInner onNavigateToThreat={onNavigateToThreat} />
    </BrainstormContextProvider>
  );
};

export default BrainstormBoard;

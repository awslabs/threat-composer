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
import Board, { BoardProps } from '@cloudscape-design/board-components/board';
import BoardItem from '@cloudscape-design/board-components/board-item';
import ContentLayout from '@cloudscape-design/components/content-layout';
import Header from '@cloudscape-design/components/header';
import { useState, ReactNode, useCallback } from 'react';
import Overview from './components/Overview';
import STRIDEAllocation from './components/STRIDEAllocation';
import ThreatGrammar from './components/ThreatGrammar';
import ThreatPrioritization from './components/ThreatPrioritization';

export interface ItemType {
  title: string;
  content: ReactNode;
}

const WorkspaceInsights = () => {
  const [items, setItems] = useState<BoardProps.Item<ItemType>[]>([
    {
      id: 'overview',
      rowSpan: 2,
      columnSpan: 6,
      data: { title: 'Threat summary', content: <Overview /> },
    },
    {
      id: 'stride-allocation',
      rowSpan: 5,
      columnSpan: 2,
      data: { title: 'STRIDE category distribution', content: <STRIDEAllocation /> },
    },
    {
      id: 'threat-grammer',
      rowSpan: 5,
      columnSpan: 2,
      data: { title: 'Threat grammar distribution', content: <ThreatGrammar /> },
    },
    {
      id: 'threat-prioritization',
      rowSpan: 5,
      columnSpan: 2,
      data: { title: 'Threat prioritization', content: <ThreatPrioritization /> },
    },
  ]);

  const handleRenderItem = useCallback((item: BoardProps.Item<ItemType>, _actions: any) => {
    return (<BoardItem
      header={<Header>{item.data.title}</Header>}
      i18nStrings={{
        dragHandleAriaLabel: 'Drag handle',
        dragHandleAriaDescription:
          'Use Space or Enter to activate drag, arrow keys to move, Space or Enter to submit, or Escape to discard.',
        resizeHandleAriaLabel: 'Resize handle',
        resizeHandleAriaDescription:
          'Use Space or Enter to activate resize, arrow keys to move, Space or Enter to submit, or Escape to discard.',
      }}
    >
      {item.data.content}
    </BoardItem>);
  }, []);

  return (<ContentLayout
    header={
      <Header
        variant="h1"
      >
        Insights dashboard
      </Header>
    }
  >
    <Board
      renderItem={handleRenderItem as (item: BoardProps.Item<unknown>) => JSX.Element}
      onItemsChange={event => {
        console.log(event.detail.items);
        setItems(event.detail.items as BoardProps.Item<ItemType>[]);
      }}
      empty={<></>}
      items={items}
      i18nStrings={(() => {
        function createAnnouncement(
          operationAnnouncement: any,
          conflicts: any,
          disturbed: any,
        ) {
          const conflictsAnnouncement =
            conflicts.length > 0
              ? `Conflicts with ${conflicts
                .map((c: BoardProps.Item<ItemType>) => c.data.title)
                .join(', ')}.`
              : '';
          const disturbedAnnouncement =
            disturbed.length > 0
              ? `Disturbed ${disturbed.length} items.`
              : '';
          return [
            operationAnnouncement,
            conflictsAnnouncement,
            disturbedAnnouncement,
          ]
            .filter(Boolean)
            .join(' ');
        }
        return {
          liveAnnouncementDndStarted: (operationType: BoardProps.DndOperationType) =>
            operationType === 'resize'
              ? 'Resizing'
              : 'Dragging',
          liveAnnouncementDndItemReordered: (operation: BoardProps.DndReorderState<unknown>) => {
            const columns = `column ${operation.placement
              .x + 1}`;
            const rows = `row ${operation.placement.y +
              1}`;
            return createAnnouncement(
              `Item moved to ${operation.direction === 'horizontal'
                ? columns
                : rows
              }.`,
              operation.conflicts,
              operation.disturbed,
            );
          },
          liveAnnouncementDndItemResized: (operation: BoardProps.DndResizeState<unknown>) => {
            const columnsConstraint = operation.isMinimalColumnsReached
              ? ' (minimal)'
              : '';
            const rowsConstraint = operation.isMinimalRowsReached
              ? ' (minimal)'
              : '';
            const sizeAnnouncement =
              operation.direction === 'horizontal'
                ? `columns ${operation.placement.width}${columnsConstraint}`
                : `rows ${operation.placement.height}${rowsConstraint}`;
            return createAnnouncement(
              `Item resized to ${sizeAnnouncement}.`,
              operation.conflicts,
              operation.disturbed,
            );
          },
          liveAnnouncementDndItemInserted: (operation: BoardProps.DndInsertState<unknown>) => {
            const columns = `column ${operation.placement
              .x + 1}`;
            const rows = `row ${operation.placement.y +
              1}`;
            return createAnnouncement(
              `Item inserted to ${columns}, ${rows}.`,
              operation.conflicts,
              operation.disturbed,
            );
          },
          liveAnnouncementDndCommitted: (operationType: BoardProps.DndOperationType) =>
            `${operationType} committed`,
          liveAnnouncementDndDiscarded: (operationType: BoardProps.DndOperationType) =>
            `${operationType} discarded`,
          liveAnnouncementItemRemoved: (op: BoardProps.ItemRemovedState<ItemType>) =>
            createAnnouncement(
              `Removed item ${op.item.data.title}.`,
              [],
              op.disturbed,
            ),
          navigationAriaLabel: 'Board navigation',
          navigationAriaDescription:
            'Click on non-empty item to move focus over',
          navigationItemAriaLabel: (item: BoardProps.Item<ItemType> | null) =>
            item ? item.data.title : 'Empty',
        };
      })()}
    /></ContentLayout>);
};

export default WorkspaceInsights;
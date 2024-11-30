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
import { useCollection } from '@cloudscape-design/collection-hooks';
import Button from '@cloudscape-design/components/button';
import { NonCancelableEventHandler } from '@cloudscape-design/components/internal/events';
import Pagination from '@cloudscape-design/components/pagination';
import TableComponent, { TableProps as CloudscapeTableProps } from '@cloudscape-design/components/table';
import TextFilter from '@cloudscape-design/components/text-filter';
import { FC, useCallback, useEffect } from 'react';
import { useReloadedTranslation } from '../../../../../i18next';
import {
  DEFAULT_TRACK_BY,
  DEFAULT_LOADING_TEXT,
  DEFAULT_PAGINATION_LABELS,
  DEFAULT_FILTERING_PLACEHOLDER,
  DEFAULT_FILTERING_ARIA_LABEL,
  getAriaLabels,
} from '../../config';
import { TableProps, InternalTableProps } from '../../types';
import EmptyState from '../EmptyState';
import Header from '../Header';

const FullDataTable: FC<TableProps & InternalTableProps> = ({
  ariaLabels,
  columnDefinitions,
  items: allItems,
  disablePagination = false,
  pagination: paginationComponent,
  disableSettings = false,
  preferences: collectionPreferenceComponent,
  disableFilters = false,
  disableRowSelect = false,
  selectionType = 'multi',
  filter: filterComponent,
  selectedItems,
  header,
  trackBy = DEFAULT_TRACK_BY,
  collectionPreferences,
  onSelectionChange,
  defaultPageIndex,
  ...props
}) => {

  const { t } = useReloadedTranslation();

  const { items, actions, collectionProps, filterProps, paginationProps } = useCollection(allItems, {
    filtering: {
      empty: <EmptyState title={t('No items')} subtitle={t('No items to display.')} />,
      noMatch: (
        <EmptyState
          title={t('No matches')}
          subtitle={t('We can’t find a match.')}
          action={<Button onClick={() => actions.setFiltering('')}>{t('Clear filter')}</Button>}
        />
      ),
    },
    pagination: {
      pageSize: collectionPreferences.pageSize,
      defaultPage: defaultPageIndex,
    },
    sorting: {
      defaultState: { sortingColumn: columnDefinitions[0] },
    },
    selection: {
      defaultSelectedItems: selectedItems,
      trackBy,
    },
  });

  useEffect(() => {
    actions.setSelectedItems(selectedItems || []);
  }, [selectedItems, paginationProps.currentPageIndex, filterProps.filteringText]);

  const collectionPropsOnSelectionChange = collectionProps.onSelectionChange;

  const handleSelectionChange: NonCancelableEventHandler<CloudscapeTableProps.SelectionChangeDetail<any>> =
        useCallback(
          (event: any) => {
            onSelectionChange?.(event);
            collectionPropsOnSelectionChange?.(event);
          },
          [onSelectionChange, collectionPropsOnSelectionChange],
        );

  return (
    <TableComponent
      trackBy={trackBy}
      loadingText={t(DEFAULT_LOADING_TEXT)}
      columnDisplay={collectionPreferences.contentDisplay}
      wrapLines={collectionPreferences.wrapLines}
      stripedRows={collectionPreferences.stripedRows}
      {...props}
      {...collectionProps}
      onSelectionChange={handleSelectionChange}
      selectionType={(!disableRowSelect && selectionType) || undefined}
      ariaLabels={ariaLabels || getAriaLabels()}
      columnDefinitions={columnDefinitions}
      items={items || []}
      pagination={
        !disablePagination &&
                (paginationComponent ?? <Pagination {...paginationProps} ariaLabels={DEFAULT_PAGINATION_LABELS} />)
      }
      preferences={collectionPreferenceComponent}
      filter={
        !disableFilters &&
                (filterComponent ?? (
                  <TextFilter
                    {...filterProps}
                    filteringPlaceholder={t(DEFAULT_FILTERING_PLACEHOLDER)}
                    filteringAriaLabel={t(DEFAULT_FILTERING_ARIA_LABEL)}
                  />
                ))
      }
      header={
        header && (
          <Header
            actions={props.actions}
            info={props.info}
            variant={props.headerVariant}
            description={props.description}
            allItemsLength={allItems.length}
            selectedItemsLength={collectionProps?.selectedItems?.length}
          >
            {header}
          </Header>
        )
      }
    />
  );
};

export default FullDataTable;

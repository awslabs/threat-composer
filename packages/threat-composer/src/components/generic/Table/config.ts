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
export const DEFAULT_TRACK_BY = 'id';
export const DEFAULT_LOADING_TEXT = 'Loading';
export const DEFAULT_PAGE_SIZE = 10;
export const DEFAULT_FILTERING_PLACEHOLDER = 'Search';
export const DEFAULT_FILTERING_ARIA_LABEL = 'Filter table content';
export const DEFAULT_COLLECTION_PREFERENCES_TITLE = 'Preferences';
export const DEFAULT_COLLECTION_PREFERENCES_CONFRIM_LABEL = 'Confirm';
export const DEFAULT_COLLECTION_PREFERENCES_CANCEL_LABEL = 'Cancel';

export const getAriaLabels = (trackBy: string = DEFAULT_TRACK_BY) => ({
  selectionGroupLabel: 'Items selection',
  allItemsSelectionLabel: ({ selectedItems }: any) =>
    `${selectedItems.length} ${selectedItems.length === 1 ? 'item' : 'items'} selected`,
  itemSelectionLabel: ({ selectedItems }: any, item: any) => {
    const isItemSelected = selectedItems.filter((i: any) => i[trackBy] === item[trackBy]).length;
    return `${item.name} is ${isItemSelected ? '' : 'not'} selected`;
  },
});

export const DEFAULT_PAGE_SIZE_OPTIONS = [
  { value: 10, label: '10 rows' },
  { value: 30, label: '30 rows' },
  { value: 50, label: '50 rows' },
];

export const DEFAULT_PAGINATION_LABELS = {
  nextPageLabel: 'Next page',
  previousPageLabel: 'Previous page',
  pageLabel: (pageNumber: number) => `Page ${pageNumber} of all pages`,
};

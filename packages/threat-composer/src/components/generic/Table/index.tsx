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
import CollectionPreferences, {
  CollectionPreferencesProps,
} from '@cloudscape-design/components/collection-preferences';
import { NonCancelableEventHandler } from '@cloudscape-design/components/internal/events';
import { FC, useMemo, useState, useCallback } from 'react';

import FullDataTable from './components/FullDataTable';
import {
  DEFAULT_COLLECTION_PREFERENCES_TITLE,
  DEFAULT_COLLECTION_PREFERENCES_CONFRIM_LABEL,
  DEFAULT_COLLECTION_PREFERENCES_CANCEL_LABEL,
  DEFAULT_PAGE_SIZE_OPTIONS,
} from './config';
import { TableProps } from './types';
import { useReloadedTranslation } from '../../../i18next';
import LocalizationContainer from '../../generic/LocalizationContainer';

/**
 * A table presents data in a two-dimensional format, arranged in columns and rows in a rectangular form.
 * */
const Table: FC<TableProps> = ({ disableSettings, preferences: collectionPreferenceComponent, ...props }) => {
  const [preferences, setPreferences] = useState<CollectionPreferencesProps.Preferences>({
    pageSize: props.defaultPageSize,
    visibleContent: props.columnDefinitions.map((cd) => cd.id || ''),
    wrapLines: true,
    stripedRows: true,
  });
  const { t, i18n } = useReloadedTranslation();

  const visibleContentOptions = useMemo(() => {
    return [
      {
        label: t('Main properties'),
        options: props.columnDefinitions.map((cd) => ({
          id: cd.id || '',
          label: (typeof cd.header === 'string' ? cd.header : cd.id) || '',
        })),
      },
    ];
  }, [t, i18n, i18n.language, props.columnDefinitions]);

  const handlePreferenceChange: NonCancelableEventHandler<CollectionPreferencesProps.Preferences<any>> = useCallback(
    ({ detail }) => {
      setPreferences(detail);
    },
    [],
  );

  const preferenceComponent = useMemo(() => {
    if (disableSettings) {
      return undefined;
    }

    if (collectionPreferenceComponent) {
      return collectionPreferenceComponent;
    }

    return (
      <LocalizationContainer i18next={i18n}>
        <CollectionPreferences
          title={t(DEFAULT_COLLECTION_PREFERENCES_TITLE)}
          confirmLabel={t(DEFAULT_COLLECTION_PREFERENCES_CONFRIM_LABEL)}
          cancelLabel={t(DEFAULT_COLLECTION_PREFERENCES_CANCEL_LABEL) }
          pageSizePreference={{
            title: t('Page size'),
            options: DEFAULT_PAGE_SIZE_OPTIONS.map(item => {return { value: item.value, label: `${item.value} ${t('rows')}` };}),
          }}
          wrapLinesPreference={{
            label: t('Wrap lines'),
            description: t('Check to see all the text and wrap the lines'),
          }}
          stripedRowsPreference={{
            label: t('Striped rows'),
            description: t('Check to add alternating shaded rows'),
          }}
          visibleContentPreference={{
            title: t('Select visible columns'),
            options: visibleContentOptions,
          }}
          preferences={preferences}
          onConfirm={handlePreferenceChange}
          {...props.collectionPreferencesProps}
        />
      </LocalizationContainer>
    );
  }, [
    t,
    i18n,
    i18n.language,
    disableSettings,
    preferences,
    props.collectionPreferencesProps,
    collectionPreferenceComponent,
    visibleContentOptions,
    handlePreferenceChange,
  ]);

  return <FullDataTable {...props} collectionPreferences={preferences} preferences={preferenceComponent} />;
};

export default Table;
export * from './types';
export * from './config';

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
/** @jsxImportSource @emotion/react */
import FormField from '@cloudscape-design/components/form-field';
import RadioGroup from '@cloudscape-design/components/radio-group';
import Select from '@cloudscape-design/components/select';
import SpaceBetween from '@cloudscape-design/components/space-between';
import { css } from '@emotion/react';
import { FC, useMemo } from 'react';
import { useReloadedTranslation } from '../../../i18next';

const styles = {
  selector: css({
    minWidth: '100px',
  }),
  radioGroup: css({
    marginTop: '10px',
  }),
};

export const DEFAULT_SORT_BY = {
  field: 'Id',
  ascending: false,
};

export interface SortByOption {
  field: string;
  ascending: boolean;
}

export interface SortByProps {
  value?: SortByOption;
  setValue: (value: SortByOption) => void;
}

const SELECT_OPTIONS = [
  { label: 'Id', value: 'Id' },
  { label: 'Priority', value: 'Priority' },
];

const SORTING_OPTIONS = [
  { value: 'ascending', label: 'Ascending' },
  { value: 'descending', label: 'Descending' },
];

const SortByComponent: FC<SortByProps> = ({
  value = DEFAULT_SORT_BY,
  setValue,
}) => {
  const { t, i18n } = useReloadedTranslation();

  const translatedSelectOptions = useMemo(() => {
    return SELECT_OPTIONS.map(x => {return { value: x.value, label: t(x.label) };});
  }, [i18n.language]);

  const translatedSortingOptions = useMemo(() => {
    return SORTING_OPTIONS.map(x => {return { value: x.value, label: t(x.label) };});
  }, [i18n.language]);

  return (<SpaceBetween direction='horizontal' size='s'>
    <div css={styles.selector}>
      <FormField
        label={t('Sort by')}
      >
        <Select
          selectedOption={{ label: value.field, value: value.field }}
          onChange={({ detail }) =>
            setValue({
              ...value,
              field: detail.selectedOption.value || DEFAULT_SORT_BY.field,
            })
          }
          options={translatedSelectOptions}
          selectedAriaLabel={t('Selected')}
        />
      </FormField>
    </div>
    <div css={styles.radioGroup}>
      <RadioGroup
        onChange={({ detail }) => setValue({
          ...value,
          ascending: detail.value === 'ascending',
        })}
        value={value.ascending ? 'ascending' : 'descending'}
        items={translatedSortingOptions}
      />
    </div>
  </SpaceBetween>);
};

export default SortByComponent;
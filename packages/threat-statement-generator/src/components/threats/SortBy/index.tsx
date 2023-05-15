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
import FormField from '@cloudscape-design/components/form-field';
import RadioGroup from '@cloudscape-design/components/radio-group';
import Select from '@cloudscape-design/components/select';
import SpaceBetween from '@cloudscape-design/components/space-between';
import { FC } from 'react';

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
  return (<SpaceBetween direction='horizontal' size='s'>
    <div style={{
      minWidth: '100px',
    }}>
      <FormField
        label="Sort by"
      >
        <Select
          selectedOption={{ label: value.field, value: value.field }}
          onChange={({ detail }) =>
            setValue({
              ...value,
              field: detail.selectedOption.value || DEFAULT_SORT_BY.field,
            })
          }
          options={SELECT_OPTIONS}
          selectedAriaLabel="Selected"
        />
      </FormField>
    </div>
    <div style={{
      marginTop: '10px',
    }}>
      <RadioGroup
        onChange={({ detail }) => setValue({
          ...value,
          ascending: detail.value === 'ascending',
        })}
        value={value.ascending ? 'ascending' : 'descending'}
        items={SORTING_OPTIONS}
      />
    </div>
  </SpaceBetween>);
};

export default SortByComponent;
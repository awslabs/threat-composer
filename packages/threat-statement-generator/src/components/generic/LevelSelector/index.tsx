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
import Select, { SelectProps } from '@cloudscape-design/components/select';
import React, { FC } from 'react';

export const OPTIONS = [
  { label: 'High', value: 'High' },
  { label: 'Medium', value: 'Medium' },
  { label: 'Low', value: 'Low' },
];

export const NO_VALUE = '-';

export interface LevelSelectorProps {
  label?: string;
  placeholder?: string;
  selectedLevel?: string;
  setSelectedLevel?: (level: string | undefined) => void;
  allowNoValue?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
}

const LevelSelector: FC<LevelSelectorProps> = React.forwardRef<SelectProps.Ref, LevelSelectorProps>(({
  label,
  selectedLevel,
  setSelectedLevel,
  allowNoValue,
  placeholder,
  onFocus,
  onBlur,
}, ref) => {
  return (
    <FormField
      label={label}
    >
      <Select
        ref={ref}
        selectedOption={OPTIONS.find(x => x.value === selectedLevel) || null}
        onChange={({ detail }) => {
          const selected = detail.selectedOption.value;
          setSelectedLevel?.(!selected || selected === NO_VALUE ? undefined : selected);
        }}
        options={allowNoValue ? [{
          label: NO_VALUE, value: NO_VALUE,
        }, ...OPTIONS] : OPTIONS}
        selectedAriaLabel="Selected"
        onFocus={onFocus}
        onBlur={onBlur}
        expandToViewport
        placeholder={placeholder}
      />
    </FormField>
  );
});

export default LevelSelector;
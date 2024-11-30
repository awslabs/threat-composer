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
import { useReloadedTranslation } from '../../../i18next';

export interface StatusSelectorProps {
  options: SelectProps.Option[];
  selectedOption?: string;
  setSelectedOption?: (option: string) => void;
  showLabel?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  ref?: React.LegacyRef<any>;
}

const StatusSelector: FC<StatusSelectorProps> = React.forwardRef<SelectProps.Ref, StatusSelectorProps>(({
  options,
  selectedOption,
  setSelectedOption,
  showLabel = true,
  onFocus,
  onBlur,
}, ref) => {
  const { t } = useReloadedTranslation();

  return (<FormField
    label={showLabel ? t('Status') : undefined}
  >
    <Select
      ref={ref}
      selectedOption={(selectedOption && options?.find(x => x.value === selectedOption)) || null}
      onChange={({ detail }) =>
        detail.selectedOption.value && setSelectedOption?.(detail.selectedOption.value)
      }
      options={options}
      onFocus={onFocus}
      onBlur={onBlur}
      placeholder={t('Select status')}
    />
  </FormField>);
});

export default StatusSelector;

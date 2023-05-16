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
import Multiselect from '@cloudscape-design/components/multiselect';
import { FC } from 'react';

export const OPTIONS = [
  { label: 'Spoofing', value: 'S' },
  { label: 'Tampering', value: 'T' },
  { label: 'Repudiation', value: 'R' },
  { label: 'Information disclosure', value: 'I' },
  { label: 'Denial of service', value: 'D' },
  { label: 'Elevation of privilege', value: 'E' },
];

export interface STRIDESelectorProps {
  label: string;
  selected?: string[];
  setSelected: (value: string[]) => void;
}

const STRIDESelector: FC<STRIDESelectorProps> = ({
  label,
  selected,
  setSelected,
}) => {
  return (
    <FormField
      label={label}
    >
      <Multiselect
        selectedOptions={selected ? OPTIONS.filter(x => selected.includes(x.value)) : []}
        onChange={({ detail }) =>
          setSelected(detail.selectedOptions.map(x => x.value || ''))
        }
        options={OPTIONS}
        selectedAriaLabel="Selected"
      />
    </FormField>
  );
};

export default STRIDESelector;
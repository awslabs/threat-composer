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
import { Button, Input, SpaceBetween, TokenGroup } from '@cloudscape-design/components';
import { FC, useCallback, useState } from 'react';

export interface RegexArrayFormProps {
  readonly strings: string[];
  readonly setStrings: (strings: string[]) => void;
  readonly placeholder?: string;
  readonly allowEmpty?: boolean;
}

export const RegexArrayForm: FC<RegexArrayFormProps> = ({ strings, setStrings, placeholder, allowEmpty }) => {
  const [value, setValue] = useState<string>('');

  const [valid, setValid] = useState<boolean>(true);

  const onAdd = useCallback(() => {
    setStrings([...strings, value]);
    setValue('');
  }, [value, strings]);

  return (
    <SpaceBetween size="m">
      <SpaceBetween size="m" direction="horizontal">
        <Input placeholder={placeholder} value={value} invalid={!valid} onChange={(e) => {
          setValue(e.detail.value);
          try {
            new RegExp(e.detail.value);
            setValid(true);
          } catch {
            setValid(false);
          }
        }} />
        <Button variant="primary" onClick={onAdd} disabled={(!allowEmpty && value === '') || !valid}>
          Add
        </Button>
      </SpaceBetween>
      <TokenGroup
        items={strings.map((v) => ({
          label: v,
          value: v,
        }))}
        onDismiss={({ detail: { itemIndex } }) => {
          if (strings.length > 1) {
            setStrings([...strings.slice(0, itemIndex), ...strings.slice(itemIndex + 1)]);
          }
        }}
      />
    </SpaceBetween>
  );
};
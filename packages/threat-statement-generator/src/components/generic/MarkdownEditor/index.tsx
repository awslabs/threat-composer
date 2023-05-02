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
import Grid from '@cloudscape-design/components/grid';
import Textarea from '@cloudscape-design/components/textarea';
import { FC } from 'react';
import MarkdownViewer from '../MarkdownViewer';

export interface MarkdownEditorProps {
  onChange: (value: string) => void;
  value: string;
  label: string;
}

const MarkdownEditor: FC<MarkdownEditorProps> = ({
  value,
  onChange,
  label,
}) => {
  return (
    <FormField
      label={label}
      stretch
    >
      <Grid gridDefinition={[{ colspan: { default: 12, xxs: 6 } },
        { colspan: { default: 12, xxs: 6 } }]}>
        <Textarea
          value={value}
          onChange={event =>
            onChange(event.detail.value)
          }
          rows={20}
        /><MarkdownViewer>
          {value}
        </MarkdownViewer>
      </Grid>
    </FormField>);
};

export default MarkdownEditor;
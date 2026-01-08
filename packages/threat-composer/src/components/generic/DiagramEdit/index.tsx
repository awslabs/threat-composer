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
import Header from '@cloudscape-design/components/header';
import RadioGroup from '@cloudscape-design/components/radio-group';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Textarea from '@cloudscape-design/components/textarea';
import { FC, useCallback, useEffect, useState } from 'react';
import ImageEdit from '../ImageEdit';
import { MermaidRenderer } from '../MarkdownViewer/MermaidRenderer';

export interface DiagramEditProps {
  value: string;
  onChange: (value: string) => void;
}

const DiagramEdit: FC<DiagramEditProps> = ({
  value,
  onChange,
}) => {
  const isMermaidCode = value && value.startsWith('mermaid:');
  const [diagramSource, setDiagramSource] = useState<string>(!value ? 'no' : isMermaidCode ? 'mermaid' : 'image');
  const [mermaidCode, setMermaidCode] = useState<string>(isMermaidCode ? value.substring(8) : '');
  const [imageValue, setImageValue] = useState<string>(isMermaidCode ? '' : value);

  useEffect(() => {
    if (diagramSource === 'no') {
      onChange('');
    } else if (diagramSource === 'mermaid') {
      onChange(`mermaid:${mermaidCode}`);
    } else if (diagramSource === 'image') {
      onChange(imageValue);
    }
  }, [onChange, diagramSource, mermaidCode, imageValue]);

  const handleImageChange = useCallback((newImageValue: string) => {
    setImageValue(newImageValue);
  }, []);

  return <SpaceBetween direction='vertical' size='s'>
    <FormField
      label="Diagram source"
      key="diagramSource"
    >
      <RadioGroup
        onChange={({ detail }) => setDiagramSource(detail.value)}
        value={diagramSource}
        items={[
          { value: 'image', label: 'Image (upload or URL)' },
          { value: 'mermaid', label: 'Mermaid diagram' },
          { value: 'no', label: 'No diagram' },
        ]}
      />
    </FormField>
    {diagramSource === 'image' && <ImageEdit value={imageValue} onChange={handleImageChange} />}
    {diagramSource === 'mermaid' && <SpaceBetween direction='vertical' size='s'>
      <FormField
        label="Mermaid diagram code"
        key="mermaidCode"
      >
        <Textarea
          value={mermaidCode}
          onChange={({ detail }) => setMermaidCode(detail.value)}
          placeholder="Enter mermaid diagram code here..."
          rows={8}
        />
      </FormField>
      {mermaidCode && <SpaceBetween direction='vertical' size='s'>
        <Header variant='h3'>Preview</Header>
        <div style={{ border: '1px solid #ccc', borderRadius: '4px', padding: '8px', backgroundColor: '#f9f9f9' }}>
          <MermaidRenderer code={mermaidCode} />
        </div>
      </SpaceBetween>}
    </SpaceBetween>}
  </SpaceBetween>;
};

export default DiagramEdit;

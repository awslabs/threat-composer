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
import { Mode } from '@cloudscape-design/global-styles';
import { CodeBlockEditorDescriptor, useCodeBlockEditorContext } from '@mdxeditor/editor';
import mermaid from 'mermaid';
import React from 'react';
import { useThemeContext } from '../ThemeProvider';

const MermaidPreview: React.FC<{ code: string; theme: Mode }> = ({ code, theme }) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const [diagramId] = React.useState(() => `mermaid-editor-${Math.random().toString(36).substr(2, 9)}`);

  React.useEffect(() => {
    const mermaidTheme = theme === Mode.Dark ? 'dark' : 'default';
    mermaid.initialize({ startOnLoad: true, theme: mermaidTheme });
  }, [theme]);

  React.useEffect(() => {
    if (ref.current && code.trim()) {
      mermaid
        .render(diagramId, code)
        .then(({ svg }: { svg: string }) => {
          if (ref.current) {
            ref.current.innerHTML = svg;
          }
        })
        .catch(() => {
          if (ref.current) {
            ref.current.innerHTML = '<div style="color: red; padding: 8px;">Invalid Mermaid syntax</div>';
          }
        });
    }
  }, [code, theme, diagramId]);

  return <div ref={ref} />;
};

export const MermaidCodeEditorDescriptor: CodeBlockEditorDescriptor = {
  match: (language) => {
    return language === 'mermaid' || language === 'mmd';
  },
  priority: 0,
  Editor: (props) => {
    const cb = useCodeBlockEditorContext();
    const [code, setCode] = React.useState(props.code);
    const { theme } = useThemeContext();

    return (
      <div
        onKeyDown={(e) => {
          e.nativeEvent.stopImmediatePropagation();
        }}
        style={{
          display: 'flex',
          gap: '8px',
          width: '100%',
        }}
      >
        <textarea
          style={{
            flex: 1,
            fontFamily: 'monospace',
            fontSize: '12px',
            padding: '8px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            resize: 'vertical',
          }}
          rows={6}
          defaultValue={props.code}
          onChange={(e) => {
            setCode(e.target.value);
            cb.setCode(e.target.value);
          }}
        />
        <div
          style={{
            flex: 1,
            padding: '8px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            overflow: 'auto',
            backgroundColor: '#f9f9f9',
          }}
        >
          <MermaidPreview code={code} theme={theme} />
        </div>
      </div>
    );
  },
};

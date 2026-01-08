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
import mermaid from 'mermaid';
import React from 'react';
import { useThemeContext } from '../ThemeProvider';

export const MermaidRenderer: React.FC<{ code: string }> = ({ code }) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const [error, setError] = React.useState(false);
  const [diagramId] = React.useState(() => `mermaid-diagram-${Math.random().toString(36).slice(2, 11)}`);
  const { theme } = useThemeContext();

  React.useEffect(() => {
    const mermaidTheme = theme === Mode.Dark ? 'dark' : 'default';
    mermaid.initialize({ startOnLoad: true, theme: mermaidTheme });
  }, [theme]);

  React.useEffect(() => {
    if (ref.current && code && code.trim()) {
      setError(false);
      try {
        mermaid
          .render(diagramId, code)
          .then(({ svg }: { svg: string }) => {
            if (ref.current) {
              ref.current.innerHTML = svg;
            }
          })
          .catch((err) => {
            console.error('Mermaid render error:', err, 'Code:', code);
            setError(true);
          });
      } catch (err) {
        console.error('Mermaid error:', err, 'Code:', code);
        setError(true);
      }
    }
  }, [code, theme, diagramId]);

  if (error) {
    return <div style={{ color: 'red', padding: '8px' }}>Invalid Mermaid diagram</div>;
  }

  return <div ref={ref} />;
};

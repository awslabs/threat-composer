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
import Alert from '@cloudscape-design/components/alert';
import Box from '@cloudscape-design/components/box';
import Spinner from '@cloudscape-design/components/spinner';
import { Mode } from '@cloudscape-design/global-styles';
import { css } from '@emotion/react';
import { FC, useEffect, useRef, useState } from 'react';
import { useThemeContext } from '../ThemeProvider';

const styles = {
  container: css({
    'overflowX': 'auto',
    '& svg': {
      maxWidth: '100%',
      height: 'auto',
    },
  }),
  source: css({
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  }),
};

/**
 * Mermaid is a sizable library, so it is imported on demand and kept in a shared promise,
 * to only initialize it once, and only when a diagram is actually rendered.
 */
let mermaidPromise: Promise<typeof import('mermaid').default> | undefined;

const loadMermaid = async () => {
  if (!mermaidPromise) {
    mermaidPromise = import('mermaid').then(module => module.default);
  }

  return mermaidPromise;
};

let diagramCount = 0;

export interface MermaidDiagramProps {
  /**
   * The Mermaid diagram definition, e.g. the content of a ```mermaid code block.
   */
  code: string;
}

/**
 * MermaidDiagram renders a Mermaid diagram definition as a SVG diagram.
 * If the definition is not valid, the error and the original definition are displayed instead.
 */
const MermaidDiagram: FC<MermaidDiagramProps> = ({ code }) => {
  const { theme } = useThemeContext();
  const [svg, setSvg] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const idRef = useRef(`threat-composer-mermaid-${diagramCount++}`);

  useEffect(() => {
    let cancelled = false;

    const renderDiagram = async () => {
      const definition = code.trim();

      if (!definition) {
        setSvg('');
        setError('');
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const mermaid = await loadMermaid();
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          theme: theme === Mode.Dark ? 'dark' : 'default',
        });

        const { svg: renderedSvg } = await mermaid.render(idRef.current, definition);

        if (!cancelled) {
          setSvg(renderedSvg);
          setError('');
        }
      } catch (e) {
        // Mermaid leaves the temporary element it renders into behind when the definition is invalid
        document.getElementById(`d${idRef.current}`)?.remove();

        if (!cancelled) {
          setSvg('');
          setError(e instanceof Error ? e.message : String(e));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void renderDiagram();

    return () => {
      cancelled = true;
    };
  }, [code, theme]);

  if (error) {
    return (<Alert type='error' header='Invalid Mermaid diagram'>
      <Box variant='p'>{error}</Box>
      <pre css={styles.source}>{code}</pre>
    </Alert>);
  }

  if (loading) {
    return (<Box><Spinner /> Rendering diagram...</Box>);
  }

  if (!svg) {
    return null;
  }

  return (<div
    css={styles.container}
    data-testid='mermaid-diagram'
    // Mermaid is configured with securityLevel 'strict', which sanitizes the generated markup
    dangerouslySetInnerHTML={{ __html: svg }}
  />);
};

export default MermaidDiagram;

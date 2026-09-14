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
import Box from '@cloudscape-design/components/box';
import SpaceBetween from '@cloudscape-design/components/space-between';
import {
  borderRadiusInput,
  colorBackgroundInputDefault,
  colorBorderInputDefault,
  colorTextBodyDefault,
  fontFamilyMonospace,
  fontSizeBodyM,
  spaceScaledS,
} from '@cloudscape-design/design-tokens';
import { css } from '@emotion/react';
import { CodeBlockEditorDescriptor, useCodeBlockEditorContext } from '@mdxeditor/editor';
import { FC, useCallback, useEffect, useState } from 'react';
import { MERMAID_LANGUAGE } from '../../../../../utils/mermaidCodeBlock';
import MermaidDiagram from '../../../MermaidDiagram';

const PREVIEW_DEBOUNCE_IN_MS = 500;
const MIN_ROWS = 5;

export const DEFAULT_MERMAID_DIAGRAM = `flowchart LR
  A[Actor] --> B[Application]
  B --> C[(Data store)]`;

const styles = {
  container: css({
    padding: spaceScaledS,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colorBorderInputDefault,
    borderRadius: borderRadiusInput,
  }),
  textarea: css({
    width: '100%',
    boxSizing: 'border-box',
    padding: spaceScaledS,
    resize: 'vertical',
    color: colorTextBodyDefault,
    backgroundColor: colorBackgroundInputDefault,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colorBorderInputDefault,
    borderRadius: borderRadiusInput,
    fontFamily: fontFamilyMonospace,
    fontSize: fontSizeBodyM,
  }),
};

export interface MermaidCodeBlockEditorProps {
  code: string;
}

/**
 * Edits the definition of a mermaid code block, with a live preview of the resulting diagram.
 */
const MermaidCodeBlockEditor: FC<MermaidCodeBlockEditorProps> = ({ code }) => {
  const { setCode } = useCodeBlockEditorContext();
  const [source, setSource] = useState(code);
  const [previewSource, setPreviewSource] = useState(code);

  useEffect(() => {
    const timer = setTimeout(() => setPreviewSource(source), PREVIEW_DEBOUNCE_IN_MS);
    return () => clearTimeout(timer);
  }, [source]);

  const handleChange = useCallback((newSource: string) => {
    setSource(newSource);
    setCode(newSource);
  }, [setCode]);

  return (<div
    css={styles.container}
    // Prevent the editor from handling the keystrokes targeting the diagram definition
    onKeyDown={e => e.nativeEvent.stopImmediatePropagation()}
  >
    <SpaceBetween direction='vertical' size='s'>
      <Box variant='awsui-key-label'>Mermaid diagram definition</Box>
      <textarea
        css={styles.textarea}
        value={source}
        rows={Math.max(MIN_ROWS, source.split('\n').length + 1)}
        spellCheck={false}
        aria-label='Mermaid diagram definition'
        onChange={e => handleChange(e.target.value)}
      />
      <MermaidDiagram code={previewSource} />
    </SpaceBetween>
  </div>);
};

export const mermaidCodeBlockEditorDescriptor: CodeBlockEditorDescriptor = {
  match: language => language === MERMAID_LANGUAGE,
  // Takes precedence over the CodeMirror editor, which matches any configured language
  priority: 10,
  Editor: MermaidCodeBlockEditor,
};

export default MermaidCodeBlockEditor;

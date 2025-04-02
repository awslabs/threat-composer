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
import { FormField, FormFieldProps } from '@cloudscape-design/components';
import { colorTextStatusError, borderRadiusInput, colorBorderInputDefault, colorBorderInputFocused } from '@cloudscape-design/design-tokens';
import { Mode } from '@cloudscape-design/global-styles';
import { css } from '@emotion/react';
import { MDXEditor, MDXEditorMethods, DiffSourceToggleWrapper, ListsToggle, toolbarPlugin, diffSourcePlugin, linkPlugin, linkDialogPlugin, UndoRedo, headingsPlugin, codeBlockPlugin, codeMirrorPlugin, markdownShortcutPlugin, BoldItalicUnderlineToggles, BlockTypeSelect, CodeToggle, CreateLink, InsertCodeBlock, InsertImage, imagePlugin, InsertTable, tablePlugin, listsPlugin, HEADING_LEVEL } from '@mdxeditor/editor';
import { FC, useState, useRef } from 'react';
import { useContentValidation } from '../../../hooks';
import { TextAreaProps } from '../Textarea';
import { useThemeContext } from '../ThemeProvider';

import '@mdxeditor/editor/style.css';

const styles = {
  default: css({
    'borderWidth': '2px',
    'borderStyle': 'solid',
    'borderRadius': ` ${borderRadiusInput}`,
    'borderColor': colorBorderInputDefault,
    '&:focus-within': {
      borderColor: colorBorderInputFocused,
    },
  }),
  error: css({
    '&&': { // Double ampersand for higher specificity
      color: colorTextStatusError,
      borderColor: colorTextStatusError,
    },
  }),
};

export interface MarkdownEditorProps extends FormFieldProps {
  onChange: (value: string) => void;
  value: string;
  validateData?: TextAreaProps['validateData'];
  allowedHeadingLevels?: HEADING_LEVEL[];
  focus?: boolean;
}

const ALLOWED_HEADING_LEVELS: HEADING_LEVEL[] = [3, 4, 5, 6];

const MarkdownEditor: FC<MarkdownEditorProps> = ({
  value,
  onChange,
  validateData,
  allowedHeadingLevels = ALLOWED_HEADING_LEVELS,
  focus = false,
  ...props
}) => {
  const [previousValue] = useState(value);
  const mdxEditorRef = useRef<MDXEditorMethods>(null);
  const { theme } = useThemeContext();
  const { tempValue, errorText, handleChange } = useContentValidation(value, onChange, validateData);

  return (<FormField
    {...props}
    errorText={errorText}
  >
    <div css={[
      styles.default, errorText && styles.error, // Put error last so it overrides previous styles
    ]}>

      <MDXEditor
        ref={mdxEditorRef}
        markdown={errorText ? value : tempValue}
        className={theme == Mode.Dark ? 'dark-theme dark-editor' : 'light-theme light-editor'}
        autoFocus={focus}
        onChange={handleChange}
        toMarkdownOptions={{
          emphasis: '_',
          bullet: '-',
        }}
        plugins={[
          toolbarPlugin({
            toolbarContents: () => (
              <DiffSourceToggleWrapper>
                <BoldItalicUnderlineToggles options={['Bold', 'Italic']} />
                <BlockTypeSelect />
                <CodeToggle />
                <CreateLink />
                <InsertImage />
                <InsertTable />
                <ListsToggle options={['bullet', 'number']} />
                <InsertCodeBlock />
                <UndoRedo />
              </DiffSourceToggleWrapper>
            ),
          }),
          codeBlockPlugin({ defaultCodeBlockLanguage: '' }),
          codeMirrorPlugin({
            codeBlockLanguages: {
              '': 'text',
            },
          }),
          tablePlugin(),
          diffSourcePlugin({ viewMode: 'rich-text', diffMarkdown: previousValue }),
          markdownShortcutPlugin(),
          listsPlugin(),
          headingsPlugin({ allowedHeadingLevels }),
          linkPlugin( { disableAutoLink: true }),
          linkDialogPlugin(),
          imagePlugin({ disableImageResize: true }),
        ]
        } />
    </div>
  </FormField>);
};

export default MarkdownEditor;
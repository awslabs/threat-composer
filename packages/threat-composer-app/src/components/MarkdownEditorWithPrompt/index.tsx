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
import { MarkdownEditorProps, useThemeContext, useContentValidation } from '@aws/threat-composer';
import { FormField } from '@cloudscape-design/components';
import { Mode } from '@cloudscape-design/global-styles';
import { MDXEditor, MDXEditorMethods, DiffSourceToggleWrapper, ListsToggle, toolbarPlugin, diffSourcePlugin, linkPlugin, linkDialogPlugin, UndoRedo, headingsPlugin, codeBlockPlugin, codeMirrorPlugin, markdownShortcutPlugin, BoldItalicUnderlineToggles, BlockTypeSelect, CodeToggle, CreateLink, InsertCodeBlock, InsertImage, imagePlugin, InsertTable, tablePlugin, listsPlugin } from '@mdxeditor/editor';
import { FC, useState, useRef } from 'react';
import { unstable_usePrompt } from 'react-router-dom';

import '@mdxeditor/editor/style.css';

const MarkdownEditorWithPrompt: FC<MarkdownEditorProps> = ({
  value,
  onChange,
  validateData,
  ...props
}) => {
  const [previousValue] = useState(value);
  const mdxEditorRef = useRef<MDXEditorMethods>(null);
  const { theme } = useThemeContext();
  const { tempValue, errorText, handleChange } = useContentValidation(value, onChange, validateData);

  unstable_usePrompt({
    message: 'You have unsaved changes, proceed anyway?',
    when: ({ currentLocation, nextLocation }) =>
      previousValue !== value &&
      currentLocation.pathname !== nextLocation.pathname,
  });

  return (<FormField
    {...props}
    errorText={errorText}
  >
    <MDXEditor
      ref={mdxEditorRef}
      markdown={errorText ? value : tempValue}
      className={theme == Mode.Dark ? 'dark-theme dark-editor' : 'light-theme light-editor'}
      autoFocus={true}
      onChange={handleChange}
      toMarkdownOptions={{
        emphasis: '_',
        bullet: '-',
      }}
      plugins={[
        toolbarPlugin({
          toolbarContents: () => (
            <>
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
            </>
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
        headingsPlugin({ allowedHeadingLevels: [3, 4, 5, 6] }),
        linkPlugin(),
        linkDialogPlugin(),
        imagePlugin({ disableImageResize: true }),
      ]
      } /></FormField>);
};

export default MarkdownEditorWithPrompt;
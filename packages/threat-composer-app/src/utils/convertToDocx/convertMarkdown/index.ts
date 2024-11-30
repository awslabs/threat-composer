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
import { Paragraph, Table, TableOfContents } from 'docx';
import frontmatter from 'remark-frontmatter';
import gfm from 'remark-gfm';
import markdown from 'remark-parse';
import { unified } from 'unified';
import docx from './plugin';
import { bidirectionalOfText } from './utils';
import fetchImage from '../fetchImage';

/**
 * Convert the markdown into Docx format
 * @param content
 */
const convertMarkdown = async (content: string, defaultDir: boolean = false) => {
  const processor = unified()
    .use(markdown)
    .use(gfm)
    .use(frontmatter)
    .use(docx,
      {
        output: 'sections',
        imageResolver: fetchImage,
        bidirectional: bidirectionalOfText(content, defaultDir),
      },
    );
  const doc = await processor.process(content);
  const sections = await doc.result;

  return sections as (Paragraph | Table | TableOfContents) [];
};

export default convertMarkdown;
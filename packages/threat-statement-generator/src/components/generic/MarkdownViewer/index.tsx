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
import Link from '@cloudscape-design/components/link';
import TextContent from '@cloudscape-design/components/text-content';
import { FC } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import frontmatter from 'remark-frontmatter';
import gfm from 'remark-gfm';

import './index.css';

export interface MarkdownViewerProps {
  children: string;
}

const components = {
  a: (props: any) => (
    <Link href={props.href as string} target="_black" external>
      {props.children}
    </Link>
  ),
};

/**
 * MarkdownViewer renders content with Markdown format.
 */
const MarkdownViewer: FC<MarkdownViewerProps> = ({ children, ...props }) => {
  return (
    <div className='markdown-viewer'>
      <TextContent {...props}>
        <ReactMarkdown remarkPlugins={[gfm, frontmatter]} rehypePlugins={[rehypeRaw]} components={components} children={children} />
      </TextContent>
    </div>
  );
};

export default MarkdownViewer;

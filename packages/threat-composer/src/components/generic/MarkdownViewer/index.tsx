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
import TextContent from '@cloudscape-design/components/text-content';
import * as awsui from '@cloudscape-design/design-tokens';
import { css } from '@emotion/react';
import { FC } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import frontmatter from 'remark-frontmatter';
import gfm from 'remark-gfm';

export interface MarkdownViewerProps {
  children: string;
  allowHtml?: boolean;
}

const styles = css({
  '& table': {
    borderCollapse: 'collapse',
  },
  '& tr': {
    borderTop: `1px solid ${awsui.colorChartsLineGrid}`,
  },
  '& th': {
    padding: '6px 13px',
    border: `1px solid ${awsui.colorChartsLineGrid}`,
  },
  '& td': {
    padding: '6px 13px',
    border: `1px solid ${awsui.colorChartsLineGrid}`,
  },
  'table tr:nth-child(2n)': {
    background: awsui.colorBackgroundCellShaded,
  },
});

const components = {
};

/**
 * MarkdownViewer renders content with Markdown format.
 */
const MarkdownViewer: FC<MarkdownViewerProps> = ({
  allowHtml = false,
  children,
  ...props
}) => {
  return (
    <div css={styles}>
      <TextContent {...props}>
        <ReactMarkdown remarkPlugins={[gfm, frontmatter]} rehypePlugins={allowHtml ? [rehypeRaw] : []} components={components} children={children} />
      </TextContent>
    </div>
  );
};

export default MarkdownViewer;

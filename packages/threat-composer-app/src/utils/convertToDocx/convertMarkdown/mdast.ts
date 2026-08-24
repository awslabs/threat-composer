/* ********************************************************************************************************************
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

import type {
  Parent,
  Literal,
  Root,
  Paragraph,
  Heading,
  ThematicBreak,
  Blockquote,
  List,
  ListItem,
  Table,
  TableRow,
  TableCell,
  HTML,
  Code,
  YAML,
  Definition,
  FootnoteDefinition,
  Text,
  Emphasis,
  Strong,
  Delete,
  InlineCode,
  Break,
  Link,
  Image,
  LinkReference,
  ImageReference,
  FootnoteReference,
  Resource,
  Association,
  Reference,
  Alternative,
  RootContent,
} from 'mdast';
export type {
  Parent,
  Literal,
  Root,
  Paragraph,
  Heading,
  ThematicBreak,
  Blockquote,
  List,
  ListItem,
  Table,
  TableRow,
  TableCell,
  HTML,
  Code,
  YAML,
  Definition,
  FootnoteDefinition,
  Text,
  Emphasis,
  Strong,
  Delete,
  InlineCode,
  Break,
  Link,
  Image,
  LinkReference,
  ImageReference,
  FootnoteReference,
  Resource,
  Association,
  Reference,
  Alternative,
};

export interface TOML extends Literal {
  type: 'toml';
}

export interface Math extends Literal {
  type: 'math';
}

export interface InlineMath extends Literal {
  type: 'inlineMath';
}

/**
 * Any node this pipeline can encounter while walking a parsed tree.
 *
 * This module used to keep a full hand-written copy of mdast's content unions
 * (TopLevelContent, BlockContent, PhrasingContent and friends) written against
 * mdast 3. mdast 4 restructured those unions, so the local copies silently
 * drifted and mdast's own node arrays stopped being assignable to them.
 * Deriving from mdast's `RootContent` removes that entire class of drift. The
 * copies are deleted; nothing outside this file referenced them.
 *
 * Widened with the nodes the remark plugins in this pipeline can contribute:
 * remark-frontmatter can yield `toml`, and the math nodes are declared above.
 *
 * mdast 4 also removed the inline `footnote` node. GFM footnotes arrive as a
 * `footnoteReference` plus a `footnoteDefinition`, both still handled by the
 * transformer.
 */
export type Content = RootContent | TOML | Math | InlineMath;

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
  Footnote,
  FootnoteReference,
  Resource,
  Association,
  Reference,
  Alternative,
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
  Footnote,
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

export type Content =
  | TopLevelContent
  | ListContent
  | TableContent
  | RowContent
  | PhrasingContent;

export type TopLevelContent =
  | BlockContent
  | FrontmatterContent
  | DefinitionContent;

export type BlockContent =
  | Paragraph
  | Heading
  | ThematicBreak
  | Blockquote
  | List
  | Table
  | HTML
  | Code
  | Math;

export type FrontmatterContent = YAML | TOML;

export type DefinitionContent = Definition | FootnoteDefinition;

export type ListContent = ListItem;

export type TableContent = TableRow;

export type RowContent = TableCell;

export type PhrasingContent = StaticPhrasingContent | Link | LinkReference;

export type StaticPhrasingContent =
  | Text
  | Emphasis
  | Strong
  | Delete
  | HTML
  | InlineCode
  | Break
  | Image
  | ImageReference
  | Footnote
  | FootnoteReference
  | InlineMath;

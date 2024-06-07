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
import {
  convertInchesToTwip,
  Packer,
  Document,
  Paragraph,
  ParagraphChild,
  Table,
  TableRow,
  TableCell,
  TableOfContents,
  TextRun,
  ImageRun,
  ExternalHyperlink,
  HeadingLevel,
  LevelFormat,
  AlignmentType,
  IImageOptions,
  ILevelsOptions,
  FootnoteReferenceRun,
  CheckBox,
} from 'docx';
import type { IPropertiesOptions } from 'docx/build/file/core-properties';
import type * as mdast from './mdast';
import { invariant } from './utils';

const ORDERED_LIST_REF = 'ordered';
const INDENT = 0.5;
const DEFAULT_NUMBERINGS: ILevelsOptions[] = [
  {
    level: 0,
    format: LevelFormat.DECIMAL,
    text: '%1.',
    alignment: AlignmentType.START,
  },
  {
    level: 1,
    format: LevelFormat.DECIMAL,
    text: '%2.',
    alignment: AlignmentType.START,
    style: {
      paragraph: {
        indent: { start: convertInchesToTwip(INDENT * 1) },
      },
    },
  },
  {
    level: 2,
    format: LevelFormat.DECIMAL,
    text: '%3.',
    alignment: AlignmentType.START,
    style: {
      paragraph: {
        indent: { start: convertInchesToTwip(INDENT * 2) },
      },
    },
  },
  {
    level: 3,
    format: LevelFormat.DECIMAL,
    text: '%4.',
    alignment: AlignmentType.START,
    style: {
      paragraph: {
        indent: { start: convertInchesToTwip(INDENT * 3) },
      },
    },
  },
  {
    level: 4,
    format: LevelFormat.DECIMAL,
    text: '%5.',
    alignment: AlignmentType.START,
    style: {
      paragraph: {
        indent: { start: convertInchesToTwip(INDENT * 4) },
      },
    },
  },
  {
    level: 5,
    format: LevelFormat.DECIMAL,
    text: '%6.',
    alignment: AlignmentType.START,
    style: {
      paragraph: {
        indent: { start: convertInchesToTwip(INDENT * 5) },
      },
    },
  },
];

export type ImageDataMap = { [url: string]: ImageData };

export type ImageData = {
  image: IImageOptions['data'];
  width: number;
  height: number;
};

export type ImageResolver = (url: string) => Promise<ImageData> | ImageData;

type Decoration = Readonly<{
  [key in (mdast.Emphasis | mdast.Strong | mdast.Delete)['type']]?: true;
}>;

type ListInfo = Readonly<{
  level: number;
  ordered: boolean;
  checked?: boolean;
}>;

type Context = Readonly<{
  deco: Decoration;
  images: ImageDataMap;
  indent: number;
  list?: ListInfo;
}>;

export interface DocxOptions
  extends Pick<
  IPropertiesOptions,
  | 'title'
  | 'subject'
  | 'creator'
  | 'keywords'
  | 'description'
  | 'lastModifiedBy'
  | 'revision'
  | 'styles'
  | 'background'
  > {
  /**
   * Set output type of `VFile.result`. `buffer` is `Promise<Buffer>`. `blob` is `Promise<Blob>`.
   */
  output?: 'buffer' | 'blob' | 'sections';
  /**
   * **You must set** if your markdown includes images. See example for [browser](https://github.com/inokawa/remark-docx/blob/main/stories/playground.stories.tsx) and [Node.js](https://github.com/inokawa/remark-docx/blob/main/src/index.spec.ts).
   */
  imageResolver?: ImageResolver;
}

export type DocxChild = Paragraph | Table | TableOfContents;
type DocxContent = DocxChild | ParagraphChild;

export interface Footnotes {
  [key: string]: { children: Paragraph[] };
}

// type to define the return value of `convertNodes`
export interface ConvertNodesReturn {
  nodes: DocxContent[];
  footnotes: Footnotes;
}

export const mdastToDocx = async (
  node: mdast.Root,
  {
    output = 'buffer',
    title,
    subject,
    creator,
    keywords,
    description,
    lastModifiedBy,
    revision,
    styles,
    background,
  }: DocxOptions,
  images: ImageDataMap,
): Promise<any> => {
  const { nodes, footnotes } = convertNodes(node.children, {
    deco: {},
    images,
    indent: 0,
  });
  const doc = new Document({
    title,
    subject,
    creator,
    keywords,
    description,
    lastModifiedBy,
    revision,
    styles,
    background,
    footnotes,
    sections: [{ children: nodes as DocxChild[] }],
    numbering: {
      config: [
        {
          reference: ORDERED_LIST_REF,
          levels: DEFAULT_NUMBERINGS,
        },
      ],
    },
  });

  switch (output) {
    case 'buffer':
      const bufOut = await Packer.toBuffer(doc);
      // feature detection instead of environment detection, but if Buffer exists
      // it's probably Node. If not, return the Uint8Array that JSZip returns
      // when it doesn't detect a Node environment.
      return typeof Buffer === 'function' ? Buffer.from(bufOut) : bufOut;
    case 'blob':
      return Packer.toBlob(doc);
    case 'sections':
      return nodes as DocxChild[];
  }
};

const convertNodes = (
  nodes: mdast.Content[],
  ctx: Context,
): ConvertNodesReturn => {
  const results: DocxContent[] = [];
  let footnotes: Footnotes = {};
  for (const node of nodes) {
    switch (node.type) {
      case 'paragraph':
        results.push(buildParagraph(node, ctx));
        break;
      case 'heading':
        results.push(buildHeading(node, ctx));
        break;
      case 'thematicBreak':
        results.push(buildThematicBreak(node));
        break;
      case 'blockquote':
        results.push(...buildBlockquote(node, ctx));
        break;
      case 'list':
        results.push(...buildList(node, ctx));
        break;
      case 'listItem':
        invariant(false, 'unreachable');
      case 'table':
        results.push(buildTable(node, ctx));
        break;
      case 'tableRow':
        invariant(false, 'unreachable');
      case 'tableCell':
        invariant(false, 'unreachable');
      case 'html':
        results.push(buildHtml(node));
        break;
      case 'code':
        results.push(buildCode(node));
        break;
      case 'yaml':
        // FIXME: unimplemented
        break;
      case 'toml':
        // FIXME: unimplemented
        break;
      case 'definition':
        // FIXME: unimplemented
        break;
      case 'footnoteDefinition':
        footnotes[node.identifier] = buildFootnoteDefinition(node, ctx);
        break;
      case 'text':
        results.push(buildText(node.value, ctx.deco));
        break;
      case 'emphasis':
      case 'strong':
      case 'delete': {
        const { type, children } = node;
        const { nodes: delete_nodes } = convertNodes(children, {
          ...ctx,
          deco: { ...ctx.deco, [type]: true },
        });
        results.push(...delete_nodes);
        break;
      }
      case 'inlineCode':
        // FIXME: transform to text for now
        results.push(buildText(node.value, ctx.deco));
        break;
      case 'break':
        results.push(buildBreak(node));
        break;
      case 'link':
        results.push(buildLink(node, ctx));
        break;
      case 'image':
        results.push(buildImage(node, ctx.images));
        break;
      case 'linkReference':
        // FIXME: unimplemented
        break;
      case 'imageReference':
        // FIXME: unimplemented
        break;
      case 'footnote':
        results.push(buildFootnote(node, ctx));
        break;
      case 'footnoteReference':
        // do we need context here?
        results.push(buildFootnoteReference(node));
        break;
      default:
        invariant(false, 'unreachable');
    }
  }
  return {
    nodes: results,
    footnotes,
  };
};

const buildParagraph = ({ children }: mdast.Paragraph, ctx: Context) => {
  const list = ctx.list;
  const { nodes } = convertNodes(children, ctx);

  if (list && list.checked != null) {
    nodes.unshift(
      new CheckBox({
        checked: list.checked,
        checkedState: { value: '2611' },
        uncheckedState: { value: '2610' },
      }),
    );
  }
  return new Paragraph({
    children: nodes,
    indent:
      ctx.indent > 0
        ? {
          start: convertInchesToTwip(INDENT * ctx.indent),
        }
        : undefined,
    ...(list &&
      (list.ordered
        ? {
          numbering: {
            reference: ORDERED_LIST_REF,
            level: list.level,
          },
        }
        : {
          bullet: {
            level: list.level,
          },
        })),
  });
};

const buildHeading = ({ children, depth }: mdast.Heading, ctx: Context) => {
  let heading: any;
  switch (depth) {
    case 1:
      heading = HeadingLevel.TITLE;
      break;
    case 2:
      heading = HeadingLevel.HEADING_1;
      break;
    case 3:
      heading = HeadingLevel.HEADING_2;
      break;
    case 4:
      heading = HeadingLevel.HEADING_3;
      break;
    case 5:
      heading = HeadingLevel.HEADING_4;
      break;
    case 6:
      heading = HeadingLevel.HEADING_5;
      break;
  }
  const { nodes } = convertNodes(children, ctx);
  return new Paragraph({
    heading,
    children: nodes,
  });
};

const buildThematicBreak = (_: mdast.ThematicBreak) => {
  return new Paragraph({
    thematicBreak: true,
  });
};

const buildBlockquote = ({ children }: mdast.Blockquote, ctx: Context) => {
  const { nodes } = convertNodes(children, { ...ctx, indent: ctx.indent + 1 });
  return nodes;
};

const buildList = (
  { children, ordered, start: _start, spread: _spread }: mdast.List,
  ctx: Context,
) => {
  const list: ListInfo = {
    level: ctx.list ? ctx.list.level + 1 : 0,
    ordered: !!ordered,
  };
  return children.flatMap((item) => {
    return buildListItem(item, {
      ...ctx,
      list,
    });
  });
};

const buildListItem = (
  { children, checked, spread: _spread }: mdast.ListItem,
  ctx: Context,
) => {
  const { nodes } = convertNodes(children, {
    ...ctx,
    ...(ctx.list && { list: { ...ctx.list, checked: checked ?? undefined } }),
  });
  return nodes;
};

const buildTable = ({ children, align }: mdast.Table, ctx: Context) => {
  const cellAligns: any[] | undefined = align?.map((a) => {
    switch (a) {
      case 'left':
        return AlignmentType.LEFT;
      case 'right':
        return AlignmentType.RIGHT;
      case 'center':
        return AlignmentType.CENTER;
      default:
        return AlignmentType.LEFT;
    }
  });

  return new Table({
    rows: children.map((r) => {
      return buildTableRow(r, ctx, cellAligns);
    }),
  });
};

const buildTableRow = (
  { children }: mdast.TableRow,
  ctx: Context,
  cellAligns: any[] | undefined,
) => {
  return new TableRow({
    children: children.map((c, i) => {
      return buildTableCell(c, ctx, cellAligns?.[i]);
    }),
  });
};

const buildTableCell = (
  { children }: mdast.TableCell,
  ctx: Context,
  align: any | undefined,
) => {
  const { nodes } = convertNodes(children, ctx);
  return new TableCell({
    children: [
      new Paragraph({
        alignment: align,
        children: nodes,
      }),
    ],
  });
};

const buildHtml = ({ value }: mdast.HTML) => {
  // FIXME: transform to text for now
  return new Paragraph({
    children: [buildText(value, {})],
  });
};

const buildCode = ({ value, lang: _lang, meta: _meta }: mdast.Code) => {
  // FIXME: transform to text for now
  return new Paragraph({
    children: [buildText(value, {})],
  });
};


const buildText = (text: string, deco: Decoration) => {
  return new TextRun({
    text,
    bold: deco.strong,
    italics: deco.emphasis,
    strike: deco.delete,
  });
};

const buildBreak = (_: mdast.Break) => {
  return new TextRun({ text: '', break: 1 });
};

const buildLink = (
  { children, url, title: _title }: mdast.Link,
  ctx: Context,
) => {
  const { nodes } = convertNodes(children, ctx);
  return new ExternalHyperlink({
    link: url,
    children: nodes,
  });
};

const buildImage = (
  { url, title: _title, alt: _alt }: mdast.Image,
  images: ImageDataMap,
) => {
  const img = images[url];
  invariant(img, `Fetch image was failed: ${url}`);

  const { image, width, height } = img;
  return new ImageRun({
    data: image,
    transformation: {
      width,
      height,
    },
  });
};

const buildFootnote = ({ children }: mdast.Footnote, ctx: Context) => {
  // FIXME: transform to paragraph for now
  const { nodes } = convertNodes(children, ctx);
  return new Paragraph({
    children: nodes,
  });
};

const buildFootnoteDefinition = (
  { children }: mdast.FootnoteDefinition,
  ctx: Context,
) => {
  return {
    children: children.map((node) => {
      const { nodes } = convertNodes([node], ctx);
      return nodes[0] as Paragraph;
    }),
  };
};

const buildFootnoteReference = ({ identifier }: mdast.FootnoteReference) => {
  // do we need Context?
  return new FootnoteReferenceRun(parseInt(identifier));
};

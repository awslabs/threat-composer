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

import type * as mdast from 'mdast';
import type { Plugin } from 'unified';
import { visit } from 'unist-util-visit';
import type { DocxChild, DocxOptions, ImageDataMap } from './transformer';
import { mdastToDocx } from './transformer';
import { invariant } from './utils';

export type { DocxOptions };

// unified 11 constrains a compiler's return type to `CompileResults`, which is
// derived from the `CompileResultMap` interface it exposes for exactly this
// purpose: a plugin compiling to something other than text registers that type
// here. See the augmentation example in unified's own index.d.ts.
//
// This compiler is deliberately asynchronous, and what it resolves to depends on
// `DocxOptions.output` -- docx sections, a Buffer, or a Blob. unified surfaces
// whatever the compiler returns on `VFile.result`, which ./index.ts awaits.
// Declaring it here is what lets `this.Compiler` typecheck without a cast.
declare module 'unified' {
  interface CompileResultMap {
    docx: Promise<DocxChild[] | Buffer | Blob>;
  }
}

const plugin: Plugin<[DocxOptions?]> = function (opts = {}) {
  let images: ImageDataMap = {};

  this.Compiler = (node) => {
    return mdastToDocx(node as any, opts, images);
  };

  return async (node) => {
    const imageList: mdast.Image[] = [];
    visit(node, 'image', (aNode) => {
      imageList.push(aNode);
    });
    if (imageList.length === 0) {
      return node;
    }

    const imageResolver = opts.imageResolver;
    invariant(imageResolver, 'options.imageResolver is not defined.');

    const imageDatas = await Promise.all(
      imageList.map(({ url }) => imageResolver(url)),
    );
    images = imageList.reduce((acc, img, i) => {
      acc[img.url] = imageDatas[i]!;
      return acc;
    }, {} as ImageDataMap);
    return node;
  };
};
export default plugin;

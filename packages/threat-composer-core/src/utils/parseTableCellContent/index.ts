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

// Helper function to dynamically import ESM modules in a CommonJS environment
const dynamicImport = async (moduleName: string) => {
  // Use a more compatible approach for dynamic imports
  return new Function('moduleName', 'return import(moduleName)')(moduleName);
};

const parseTableCellContent = async (str: string) => {
  if (str) {
    try {
      // Dynamically import ESM modules using our helper function
      const [
        unifiedModule,
        remarkParseModule,
        remarkGfmModule,
        remarkRehypeModule,
        rehypeStringifyModule,
      ] = await Promise.all([
        dynamicImport('unified'),
        dynamicImport('remark-parse'),
        dynamicImport('remark-gfm'),
        dynamicImport('remark-rehype'),
        dynamicImport('rehype-stringify'),
      ]);

      const unified = unifiedModule.unified || unifiedModule.default;
      const remarkParse = remarkParseModule.default;
      const remarkGfm = remarkGfmModule.default;
      const remarkRehype = remarkRehypeModule.default;
      const rehypeStringify = rehypeStringifyModule.default;

      const htmlOutput = await unified()
        .use(remarkParse)
        .use(remarkGfm)
        .use(remarkRehype)
        .use(rehypeStringify)
        .process(str);

      const output = String(htmlOutput).replace(/(\r\n|\n|\r)/gm, '');
      return output;
    } catch (error) {
      // If there's an error with the dynamic imports, return the original string
      console.error('Error processing table cell content:', error);
      return str;
    }
  }

  return str;
};

export default parseTableCellContent;

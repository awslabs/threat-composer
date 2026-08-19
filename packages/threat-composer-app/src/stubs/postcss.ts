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

/**
 * Browser stub for `postcss`, aliased in vite.config.ts.
 *
 * `sanitize-html` does a top-level `require('postcss')` purely to parse `style`
 * attributes, and its own source says that path "only works in a node
 * environment due to a postcss dependency". Loading real postcss in the browser
 * pulls in its Node-only internals (`fs`, `path`, `url`, `source-map-js`), which
 * webpack silently dropped by honouring postcss's `browser` field but Vite
 * replaces with warning proxies that log on every property access.
 *
 * `packages/threat-composer/src/utils/sanitizeHtml` passes
 * `parseStyleAttributes: false`, so `parse` is never reached. It throws rather
 * than returning something plausible so that any future code path which does
 * need real CSS parsing fails loudly instead of silently mis-sanitizing.
 *
 * postcss is not reachable from anywhere else in the browser bundle; Vite's own
 * CSS pipeline imports postcss directly in Node and is unaffected by this alias.
 */
const unsupported = (name: string) => () => {
  throw new Error(
    `postcss.${name}() is not available in the browser bundle. See `
    + 'packages/threat-composer-app/src/stubs/postcss.ts',
  );
};

export const parse = unsupported('parse');
export const stringify = unsupported('stringify');

export default { parse, stringify };

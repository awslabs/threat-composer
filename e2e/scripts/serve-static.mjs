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

/**
 * Dumb static file server, rooted at the directory you point it at.
 *
 * Used for the extension build variants (`build/browser-extension`,
 * `build/ide-extension`). Those builds are compiled with `base: '/'`, so every
 * asset URL in index.html is absolute and root-relative — the bundle only works
 * when it is served from the SERVER ROOT, which is why this exists rather than
 * reusing serve-github-pages.mjs (that one deliberately mounts under a prefix).
 *
 * Deliberately NO SPA history fallback. The extension builds use a MemoryRouter,
 * so no deep-link URL is ever requested and a fallback would only mask mistakes.
 * An unknown path returns a real 404, which is what lets a spec assert that the
 * bundle never asks for `/service-worker.js`.
 *
 * Usage:
 *   node scripts/serve-static.mjs <dir> [--port 5061]
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const positional = args.filter((a) => !a.startsWith('--'));
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};

const ROOT = path.resolve(positional[0] ?? '.');
const PORT = Number(flag('port', process.env.PORT ?? '5061'));

const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.txt': 'text/plain',
  '.map': 'application/json',
};

if (!fs.existsSync(ROOT)) {
  console.error(`[serve-static] build directory not found: ${ROOT}`);
  console.error('[serve-static] build it first, e.g. yarn e2e:build:variants');
  process.exit(1);
}

if (!fs.existsSync(path.join(ROOT, 'index.html'))) {
  console.error(`[serve-static] no index.html in ${ROOT} — is this a build output directory?`);
  process.exit(1);
}

http
  .createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    let pathname = decodeURIComponent(url.pathname);

    if (pathname.endsWith('/')) {
      pathname += 'index.html';
    }

    const file = path.join(ROOT, pathname);

    // Guard against path traversal out of the served directory.
    if (
      (file === ROOT || file.startsWith(ROOT + path.sep)) &&
      fs.existsSync(file) &&
      fs.statSync(file).isFile()
    ) {
      res.writeHead(200, {
        'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream',
      });
      fs.createReadStream(file).pipe(res);
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end(`not found: ${pathname}`);
  })
  .listen(PORT, () => {
    console.log(`[serve-static] serving ${ROOT} at http://localhost:${PORT}/`);
  });

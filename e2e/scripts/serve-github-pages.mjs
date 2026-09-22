/** *******************************************************************************************************************
  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
  SPDX-License-Identifier: Apache-2.0
 ******************************************************************************************************************** */

/**
 * Minimal static server that mimics GitHub Pages project-page behaviour, so the
 * deep-link recovery path can actually be exercised.
 *
 * `vite preview` and `serve -s` both fall back to index.html for unknown paths,
 * which is exactly the behaviour GitHub Pages does NOT have — and the whole
 * reason 404.html exists. This serves the build under a sub-path and returns
 * 404.html with a real 404 status for anything it cannot find, which is what
 * triggers the `?/…` rewrite.
 *
 * Usage:
 *   node scripts/serve-github-pages.mjs <dir> [--prefix /threat-composer] [--port 5050]
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

const ROOT = path.resolve(positional[0] ?? '../packages/threat-composer-app/build/website-ghpages');
const PREFIX = flag('prefix', '/threat-composer');
const PORT = Number(flag('port', process.env.PORT ?? '5050'));

const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain',
  '.map': 'application/json',
};

if (!fs.existsSync(ROOT)) {
  console.error(`[serve-github-pages] build directory not found: ${ROOT}`);
  process.exit(1);
}

http
  .createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    let pathname = decodeURIComponent(url.pathname);

    if (!pathname.startsWith(PREFIX)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('not found (outside the project prefix)');
      return;
    }

    pathname = pathname.slice(PREFIX.length) || '/';
    if (pathname.endsWith('/')) {
      pathname += 'index.html';
    }

    const file = path.join(ROOT, pathname);
    // Guard against path traversal out of the served directory.
    if (file.startsWith(ROOT) && fs.existsSync(file) && fs.statSync(file).isFile()) {
      res.writeHead(200, {
        'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream',
      });
      fs.createReadStream(file).pipe(res);
      return;
    }

    // The behaviour that matters: unknown path -> 404.html with a 404 status.
    res.writeHead(404, { 'Content-Type': 'text/html' });
    fs.createReadStream(path.join(ROOT, '404.html')).pipe(res);
  })
  .listen(PORT, () => {
    console.log(`[serve-github-pages] serving ${ROOT} at http://localhost:${PORT}${PREFIX}`);
  });

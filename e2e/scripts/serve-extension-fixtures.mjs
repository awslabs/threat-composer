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
 * Fake code-host pages for the browser-extension tests.
 *
 * Why a real server rather than `page.route`: the extension's content script does
 * not fetch the raw file itself. It asks the BACKGROUND service worker to do it
 * (`forwardFetchToBackground` -> `browser.runtime.sendMessage({url})` ->
 * `fetch()` in background.ts). Playwright's `page.route` only intercepts the
 * page's own requests, so a routed fixture leaves the background fetch hitting a
 * dead origin, `sendResponse(null)` fires, and the button never enables. Serving
 * for real is the only way to exercise the whole pipeline.
 *
 * Routes, all keyed off the URL so a spec picks behaviour by navigating:
 *
 *   /<platform>/blob/<name>.tc.json      an HTML page shaped like that host's
 *                                        file viewer, with a working raw link
 *   /<platform>/raw/<name>.tc.json       the raw JSON the background will fetch
 *   /rawfile/<name>.tc.json              a bare <pre> page (the raw-file path)
 *   ...?raw=1                            the raw JSON (Amazon Code style)
 *
 * <platform> is one of github | gitlab | bitbucket | amazoncode.
 * <name> selects the payload:
 *   anything containing "invalid"  -> JSON with no `schema` key
 *   anything containing "notjson"  -> not JSON at all
 *   otherwise                      -> a valid threat model
 *
 * Usage: node scripts/serve-extension-fixtures.mjs [--port 4190]
 */
import http from 'node:http';

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const PORT = Number(flag('port', process.env.PORT ?? '4190'));

const VALID_MODEL = {
  schema: 1,
  applicationInfo: { name: 'Extension fixture model' },
  architecture: {},
  dataflow: {},
  assumptions: [],
  mitigations: [],
  assumptionLinks: [],
  mitigationLinks: [],
  threats: [],
};

const NO_SCHEMA_MODEL = {
  applicationInfo: { name: 'Not a threat model' },
  somethingElse: true,
};

const payloadFor = (pathname) => {
  if (pathname.includes('notjson')) {
    return { body: 'this is definitely not json', contentType: 'text/plain' };
  }

  if (pathname.includes('invalid')) {
    return { body: JSON.stringify(NO_SCHEMA_MODEL), contentType: 'application/json' };
  }

  return { body: JSON.stringify(VALID_MODEL), contentType: 'application/json' };
};

const page = (body) =>
  `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>fixture</title></head><body>${body}</body></html>`;

/**
 * Each template must satisfy that handler's readiness selectors AND its raw-button
 * finder, both of which are strategy lists in the handler source. The shapes below
 * mirror the first strategy in each case.
 */
const TEMPLATES = {
  // github-handler: ready on `.repository-content`, raw via `[data-testid="raw-button"]`,
  // container lookup prefers `[class*="ButtonGroup"]` then `[class*="BlobHeader"]`.
  github: (rawHref) =>
    page(`
      <div class="repository-content">
        <div class="file-navigation"></div>
        <div class="BlobHeader">
          <div class="prc-ButtonGroup-ButtonGroup-vcMeG">
            <a data-testid="raw-button" data-size="small" data-variant="default"
               class="prc-Button-ButtonBase-c50BI" href="${rawHref}">Raw</a>
          </div>
        </div>
      </div>`),

  // gitlab-handler: ready on `.file-holder`, raw via `a[title='Open raw']`, and
  // getGitLabRawUrl needs the href to contain `/-/raw/`.
  gitlab: (rawHref) =>
    page(`
      <div class="file-holder">
        <div class="file-actions">
          <a title="Open raw" class="btn btn-default btn-icon" href="${rawHref}">Raw</a>
        </div>
      </div>`),

  // bitbucket-handler: ready on `[data-testid='file-actions']`, needs BOTH
  // `[data-qa='bk-file__menu']` and `[data-qa='bk-file__action-button']` present,
  // no DIV with role="presentation" anywhere inside, and the action button must be
  // nested at least two levels because insertion mutates
  // clone.childNodes[0].childNodes[0].
  // NOTE: no whitespace between these tags, deliberately. The handler reaches the
  // inner element with `clone.childNodes[0].childNodes[0]`, and any newline or
  // indentation makes childNodes[0] a TEXT node, whose childNodes[0] is undefined
  // -- the handler then throws "Cannot set properties of undefined (setting 'id')"
  // and swallows it, so the button silently never appears. Verified.
  bitbucket: () =>
    page(
      '<div data-testid="file-actions">' +
        '<div data-qa="bk-file__action-button" class="css-bk-action">' +
        '<div><a href="#" class="css-inner">Raw</a></div>' +
        '</div>' +
        '<div data-qa="bk-file__menu"><button type="button">More</button></div>' +
        '</div>',
    ),

  // amazon-code-handler: needs a `.file_header`, then `#file_actions .button_group`.
  // Its raw URL is always `window.location + '?raw=1'`.
  amazoncode: () =>
    page(`
      <div class="file_header">
        <div id="file_actions">
          <ul class="button_group">
            <li><a class="minibutton" href="#">Raw</a></li>
          </ul>
        </div>
      </div>`),
};

http
  .createServer((req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const pathname = decodeURIComponent(url.pathname);

    const send = (status, contentType, body) => {
      res.writeHead(status, { 'Content-Type': contentType });
      res.end(body);
    };

    // Amazon Code raw form: same path with ?raw=1.
    if (url.searchParams.has('raw')) {
      const { body, contentType } = payloadFor(pathname);
      send(200, contentType, body);
      return;
    }

    // A bare raw file: the content script's raw-file path reads the <pre>.
    const rawFile = pathname.match(/^\/rawfile\/(.+)$/);
    if (rawFile) {
      const { body } = payloadFor(pathname);
      send(200, 'text/html', page(`<pre>${body}</pre>`));
      return;
    }

    // Bitbucket is special: its handler derives the raw URL from location.pathname
    // rather than from the button's href. getBitbucketRawUrl() strips the first two
    // path segments and rewrites a leading `src/` to `raw/`, so the fixture has to
    // use Bitbucket's real shape: /<workspace>/<repo>/src/<branch>/<file>.
    const bbRaw = pathname.match(/^\/[^/]+\/[^/]+\/raw\/(.+)$/);
    if (bbRaw) {
      const { body, contentType } = payloadFor(pathname);
      send(200, contentType, body);
      return;
    }

    const bbSrc = pathname.match(/^\/[^/]+\/[^/]+\/src\/(.+)$/);
    if (bbSrc) {
      send(200, 'text/html', TEMPLATES.bitbucket());
      return;
    }

    // /<platform>/raw/... -> the JSON the background service worker fetches.
    const raw = pathname.match(/^\/(github|gitlab|amazoncode)\/(?:-\/)?raw\/(.+)$/);
    if (raw) {
      const { body, contentType } = payloadFor(pathname);
      send(200, contentType, body);
      return;
    }

    // /<platform>/blob/... -> the fake file-viewer page.
    const blob = pathname.match(/^\/(github|gitlab|amazoncode)\/(?:-\/)?blob\/(.+)$/);
    if (blob) {
      const [, platform, rest] = blob;
      // GitLab's raw URLs carry the `/-/raw/` infix its handler looks for.
      const rawHref =
        platform === 'gitlab' ? `/gitlab/-/raw/${rest}` : `/${platform}/raw/${rest}`;
      send(200, 'text/html', TEMPLATES[platform](rawHref));
      return;
    }

    send(404, 'text/plain', `no fixture for ${pathname}`);
  })
  .listen(PORT, () => {
    console.log(`[serve-extension-fixtures] listening on http://localhost:${PORT}/`);
  });

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

import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import {
  test as base,
  chromium,
  expect,
  type BrowserContext,
  type Locator,
  type Page,
  type Worker,
} from '@playwright/test';

/**
 * Loads the built WXT extension as a REAL Chromium extension.
 *
 * Per https://playwright.dev/docs/chrome-extensions, extensions only work in
 * Chromium and only under `launchPersistentContext`. Two details matter:
 *
 *  - `channel: 'chromium'` is what allows extensions to load in HEADLESS mode.
 *    Without it the context must be headed. Google Chrome and Edge removed the
 *    side-loading flags entirely, so the bundled Chromium is the only option.
 *  - The user data dir must be unique per context, otherwise parallel workers
 *    fight over the same profile. Passing '' lets Playwright allocate a temp one.
 *
 * The extension is MV3, so its background is a service worker and the extension
 * id is recovered from that worker's URL. WXT generates the `background.js`
 * service worker entry itself — `wxt.config.ts` does not declare one.
 */

// This file lives in e2e/fixtures, so the repo root is two levels up.
const FIXTURES_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(FIXTURES_DIR, '../..');

/** The built, unpacked Chrome MV3 extension. */
export const EXTENSION_PATH = path.join(
  REPO_ROOT,
  'packages/threat-composer-app-browser-extension/.output/chrome-mv3',
);

/**
 * Origin of the fake code-host pages, served for real by
 * scripts/serve-extension-fixtures.mjs.
 *
 * It has to be a genuine server rather than `page.route`: the content script asks
 * the BACKGROUND service worker to fetch the raw file, and `page.route` does not
 * intercept service-worker requests. Verified — with a routed fixture the
 * background's fetch fails, `sendResponse(null)` fires, and the button never
 * leaves its disabled state.
 */
export const FIXTURE_ORIGIN = 'http://localhost:4190';

type ExtensionFixtures = {
  context: BrowserContext;
  extensionId: string;
  /** The MV3 background service worker. */
  background: Worker;
};

export const test = base.extend<ExtensionFixtures>({
  context: async ({}, use) => {
    if (!fs.existsSync(path.join(EXTENSION_PATH, 'manifest.json'))) {
      throw new Error(
        `No built extension at ${EXTENSION_PATH}. Run: yarn e2e:build:extension`,
      );
    }

    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
      ],
      // The embedded viewer copies "Copy as Markdown" behaviour from the web app.
      permissions: ['clipboard-read', 'clipboard-write'],
      reducedMotion: 'reduce',
    });

    await use(context);
    await context.close();
  },

  background: async ({ context }, use) => {
    let [worker] = context.serviceWorkers();
    if (!worker) {
      worker = await context.waitForEvent('serviceworker');
    }

    await use(worker);
  },

  extensionId: async ({ background }, use) => {
    // chrome-extension://<id>/background.js
    const extensionId = background.url().split('/')[2];
    await use(extensionId);
  },
});

export { expect };

/** Absolute URL of a page inside the extension bundle. */
export const extensionUrl = (extensionId: string, file: string): string =>
  `chrome-extension://${extensionId}/${file}`;

/**
 * Overwrite the extension's stored config.
 *
 * Evaluated in the SERVICE WORKER, which is the only context with extension
 * privileges available to us before a content script runs. Note the global is
 * `chrome`, not `browser`: WXT maps its `browser` import onto `chrome` for the
 * Chrome build, and that binding is module-scoped, not global.
 *
 * Needed because the content script aborts early unless the current URL matches
 * a configured `urlRegexes` entry, and the shipped defaults only cover real code
 * hosts (github.com, gitlab.com, bitbucket.org, code.amazon.com, codecatalyst.aws).
 */
export async function seedConfig(background: Worker, config: unknown): Promise<void> {
  await background.evaluate(async (value) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (globalThis as any).chrome.storage.local.set({ tcConfig: value });
  }, config);
}

/** Read a key out of the extension's local storage. */
export async function readStorage<T = unknown>(
  background: Worker,
  key: string,
): Promise<T | undefined> {
  return background.evaluate(async (k) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const all = await (globalThis as any).chrome.storage.local.get([k]);
    return all[k];
  }, key) as Promise<T | undefined>;
}

/** Remove everything the extension has stored, for test isolation. */
export async function clearStorage(background: Worker): Promise<void> {
  await background.evaluate(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (globalThis as any).chrome.storage.local.clear();
  });
}

export type Platform = 'github' | 'gitlab' | 'bitbucket' | 'amazoncode';

/**
 * URL of a fake file-viewer page on the fixture server. `name` selects the
 * payload the raw URL will return: include "invalid" for JSON with no `schema`,
 * "notjson" for unparseable content.
 *
 * The path deliberately ends in `.tc.json` because every handler gates on
 * `matchesFileExtension()`, which tests `window.location.href` against the
 * configured `fileExtension`.
 */
export const blobUrl = (platform: Platform, name = 'model.tc.json'): string => {
  if (platform === 'gitlab') {
    // The GitLab handler requires the raw href to contain `/-/raw/`.
    return `${FIXTURE_ORIGIN}/gitlab/-/blob/${name}`;
  }

  if (platform === 'bitbucket') {
    // The Bitbucket handler ignores the button href and derives the raw URL from
    // location.pathname: it drops the first two segments and rewrites a leading
    // `src/` to `raw/`. So the fixture must use Bitbucket's real URL shape.
    return `${FIXTURE_ORIGIN}/workspace/repo/src/main/${name}`;
  }

  return `${FIXTURE_ORIGIN}/${platform}/blob/${name}`;
};

/** A bare raw file served as a `<pre>` block, which is the raw-file code path. */
export const rawFileUrl = (name = 'model.tc.json'): string =>
  `${FIXTURE_ORIGIN}/rawfile/${name}`;

/**
 * A config that puts the fixture origin in scope for exactly one platform.
 *
 * Necessary because the orchestrator aborts at `isInScope()` unless the current
 * URL matches some enabled integration's `urlRegexes`, and the shipped defaults
 * only list real hosts. Enabling one platform at a time also pins which handler
 * runs: dispatch is first-match over a fixed priority order
 * (gitlab, github, codecatalyst, codeamazon, bitbucket), so leaving several
 * enabled against the same origin would silently always choose GitLab.
 */
export function configForPlatform(platform: Platform, overrides: Record<string, unknown> = {}) {
  const off = (name: string) => ({
    name,
    enabled: false,
    urlRegexes: [] as string[],
    rawUrlPatterns: [] as string[],
  });

  const integrations: Record<string, unknown> = {
    codeamazon: off('Amazon Code Browser'),
    codecatalyst: off('Amazon CodeCatalyst'),
    bitbucket: off('Bitbucket'),
    github: off('GitHub'),
    gitlab: off('GitLab'),
  };

  const names: Record<Platform, string> = {
    github: 'GitHub',
    gitlab: 'GitLab',
    bitbucket: 'Bitbucket',
    amazoncode: 'Amazon Code Browser',
  };

  // The extension's key for Amazon Code is `codeamazon`, not `amazoncode`.
  const key = platform === 'amazoncode' ? 'codeamazon' : platform;

  integrations[key] = {
    name: names[platform],
    enabled: true,
    // Matches the fixture origin only.
    urlRegexes: ['localhost:4190'],
    // Substring matches (NOT regexes) used by isActualRawSite.
    rawUrlPatterns: ['/rawfile/', 'raw=1'],
  };

  return {
    debug: true,
    fileExtension: '.tc.json',
    integrations,
    ...overrides,
  };
}

/** The button the content script injects, by its documented id. */
export const tcButton = (page: Page): Locator => page.locator('#threatComposerButton');

/** Text the injected button always carries. */
export const TC_BUTTON_TEXT = 'View in Threat Composer';

/**
 * Assert the injected button has been enabled (or not).
 *
 * Do NOT test this by reading `onclick`. Content scripts run in an ISOLATED
 * world, and an event-handler property assigned there is not reflected into the
 * main world that `page.evaluate` runs in — `onclick` reads back as `null` even
 * after the extension has wired it up. Verified: the debug log says "enabling
 * View in Threat Composer button" while `onclick !== null` evaluates false.
 *
 * `disabled` and inline `style.pointerEvents` are reflected DOM state, so they
 * ARE visible across worlds. Which one applies depends on the tag the handler
 * built: GitHub and the raw-file path create a `<button>`, GitLab / Amazon Code /
 * Bitbucket create an `<a>`.
 */
export async function expectButtonEnabled(page: Page, enabled: boolean): Promise<void> {
  const button = tcButton(page).first();
  await expect(button).toBeVisible();

  const tag = await button.evaluate((el) => el.tagName);

  if (tag === 'BUTTON') {
    await expect
      .poll(async () => button.evaluate((el) => (el as HTMLButtonElement).disabled), {
        message: `<button> should be ${enabled ? 'enabled' : 'disabled'}`,
      })
      .toBe(!enabled);
    return;
  }

  await expect
    .poll(async () => button.evaluate((el) => (el as HTMLElement).style.pointerEvents), {
      message: `<a> pointer-events should be ${enabled ? 'auto' : 'none'}`,
    })
    .toBe(enabled ? 'auto' : 'none');
}

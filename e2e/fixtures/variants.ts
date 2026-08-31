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

import { type Locator, type Page } from '@playwright/test';
import { test, expect } from './console-guard';
import { cs } from './cloudscape';
import { threatSaveButton } from './selectors';

/**
 * Helpers for the two extension build variants.
 *
 * These builds differ from the website in one way that invalidates every helper
 * in ./app.ts: they use a **MemoryRouter**. `vite build --mode <variant>` inlines
 * `VITE_APP_MODE`, `isMemoryRouterUsed()` becomes true, and
 * `routes/index.tsx` picks `createMemoryRouter` over `createBrowserRouter`.
 *
 * Consequences, all verified against the built artifacts:
 *  - The address bar NEVER changes. `page.url()` stays at the document URL for
 *    the life of the test, so every `toHaveURL` assertion in ./app.ts is unusable
 *    and `page.goto('/workspaces/default/threats')` is meaningless — the static
 *    server 404s it, and even if it served index.html the router would still start
 *    at '/'.
 *  - Navigation must be driven by CLICKING. The side nav calls `preventDefault()`
 *    then the router's `navigate()` (FullAppLayout/index.tsx), which is exactly
 *    why the app works inside an extension host with no real URL bar.
 *  - `page.reload()` throws away all router state and returns to the first screen.
 *  - `page.goBack()` / `goForward()` do not drive app navigation.
 *
 * The side nav's active-item highlight is NOT usable as a navigation signal: the
 * items carry RELATIVE hrefs (`threats`) while `activeHref` is built from
 * `location.pathname` and so is absolute (`/workspaces/default/threats`). They
 * never match, so Cloudscape sets `aria-current` on nothing. Verified empirically
 * in both variants — every nav link reports `aria-current: null` even while its
 * screen is displayed. Assert on rendered CONTENT instead.
 */

export type Variant = 'browser-extension' | 'ide-extension';

/**
 * Workspace CONTENT is stored under this prefix. Used to tell the two storage
 * strategies apart: `useWorkspaceStorage` selects `STORAGE_LOCAL_STATE` for
 * ide-extension and `STORAGE_LOCAL_STORAGE` otherwise.
 */
export const WORKSPACE_DATA_PREFIX = 'ThreatStatementGenerator.';

/**
 * Written on first load regardless of the storage strategy, so it is NOT evidence
 * of workspace persistence and must be excluded when asserting that the
 * ide-extension build persists nothing.
 */
export const NEW_VISIT_FLAG = 'ThreatStatementGenerator.newVisitFlag';

export const sideNav = (page: Page): Locator => page.getByRole('navigation');

export const sideNavLink = (page: Page, name: string): Locator =>
  sideNav(page).getByRole('link', { name, exact: true });

/**
 * Load the variant. '/' is the ONLY meaningful URL: the bundle is built with
 * `base: '/'` so its assets are absolute and root-relative, and the memory router
 * ignores the document path anyway.
 */
export async function bootVariant(page: Page): Promise<void> {
  await page.goto('/');
  await expect(
    sideNav(page).getByText('Dashboard', { exact: true }).first(),
    'the app shell should mount',
  ).toBeVisible();
}

/** Navigate the only way these builds can be navigated: by clicking. */
export async function navigateBySideNav(page: Page, linkName: string): Promise<void> {
  await sideNavLink(page, linkName).click();
}

export async function serviceWorkerCount(page: Page): Promise<number> {
  return page.evaluate(async () => {
    if (!navigator.serviceWorker) {
      return 0;
    }

    const registrations = await navigator.serviceWorker.getRegistrations();
    return registrations.length;
  });
}

export async function localStorageKeys(page: Page): Promise<string[]> {
  return page.evaluate(() => Object.keys(localStorage));
}

/** Workspace-content keys only, excluding the first-visit flag. */
export async function workspaceDataKeys(page: Page): Promise<string[]> {
  const keys = await localStorageKeys(page);
  return keys.filter((k) => k.startsWith(WORKSPACE_DATA_PREFIX) && k !== NEW_VISIT_FLAG);
}

/**
 * Inject the `<meta name="dark-mode">` tag that the IDE toolkit webview host
 * supplies in production. Nothing in this repo emits it — `src/index.tsx` only
 * READS it — so a test has to provide it.
 *
 * It must exist before the entry module runs. `addInitScript` is too early
 * (`document.head` is still null) and DOMContentLoaded is too late (module
 * scripts are deferred and run first), so the HTML document itself is rewritten.
 * Fulfilling with an explicit status/contentType matters: passing the original
 * response alongside a modified body leaves a stale `content-length` and the
 * bundle fails to load.
 */
export async function injectDarkModeMeta(page: Page, content: string): Promise<void> {
  await page.route(
    (url) => url.pathname === '/' || url.pathname === '/index.html',
    async (route) => {
      const response = await route.fetch();
      const body = (await response.text()).replace(
        '<head>',
        `<head><meta name="dark-mode" content="${content}">`,
      );
      await route.fulfill({ status: 200, contentType: 'text/html', body });
    },
  );
}

/**
 * Create a threat without touching a URL. `app.ts`'s `addThreat` cannot be reused
 * because it asserts `/threats/new` and `/threats`. "Give me a random example"
 * fills a complete statement, which keeps this focused on "does the bundle work"
 * rather than re-testing the editor.
 */
export async function addThreatByClicking(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Add new threat' }).first().click();
  await expect(page.getByRole('heading', { name: "Let's write a threat statement!" })).toBeVisible();

  await page.getByRole('button', { name: 'Give me a random example' }).click();

  const save = threatSaveButton(page, 'new');
  await expect(save, 'a random example is a complete statement').toBeEnabled();
  await save.click();

  await expect(page.getByRole('heading', { name: /^Threats \(1\)/ })).toBeVisible();
}

/**
 * Every screen reachable from the side nav, with the heading that identifies it.
 * Captured from the built artifacts rather than guessed. Note Dashboard shows the
 * "Threat Composer" landing page while the workspace is empty — `WorkspaceHome`
 * only renders insights once there is content.
 */
export const SIDE_NAV_SCREENS: { link: string; heading: string | RegExp }[] = [
  { link: 'Dashboard', heading: 'Threat Composer' },
  { link: 'Application info', heading: 'Application information' },
  { link: 'Architecture', heading: 'Architecture' },
  { link: 'Dataflow', heading: 'Dataflow' },
  { link: 'Assumptions', heading: /^Assumptions \(\d+\)/ },
  { link: 'Threats', heading: /^Threats \(\d+\)/ },
  { link: 'Mitigations', heading: /^Mitigations \(\d+\)/ },
  { link: 'Brainstorming', heading: 'Brainstorm' },
];

/**
 * The contract BOTH extension variants must satisfy. Registered as real tests by
 * each variant's spec so it runs once per project, each against its own server.
 */
export function registerSharedVariantContract(variant: Variant): void {
  test.describe(`${variant} build`, () => {
    test('boots and mounts the app shell with no console errors', async ({ page }) => {
      await bootVariant(page);
      // The console guard fixture asserts the no-errors half after the test.
      await expect(page.locator('#root')).toBeVisible();
    });

    test('registers no service worker and never requests one', async ({ page }) => {
      const requested: string[] = [];
      page.on('request', (r) => requested.push(new URL(r.url()).pathname));

      await bootVariant(page);
      // Give the load event, which is what serviceWorkerRegistration.register()
      // waits for, a chance to have fired and done nothing.
      await page.waitForLoadState('load');

      expect(
        await serviceWorkerCount(page),
        'extension builds skip registration via !isMemoryRouterUsed()',
      ).toBe(0);
      expect(
        requested.filter((p) => p.includes('service-worker')),
        'the bundle should never fetch service-worker.js (it is not even emitted)',
      ).toEqual([]);
    });

    test('every side-nav screen renders', async ({ page }) => {
      await bootVariant(page);

      for (const { link, heading } of SIDE_NAV_SCREENS) {
        await navigateBySideNav(page, link);
        await expect(
          page.getByRole('heading', { name: heading }).first(),
          `"${link}" should render its screen`,
        ).toBeVisible();
      }
    });

    test('the address bar never changes, because the router is in memory', async ({ page }) => {
      await bootVariant(page);
      const initialUrl = page.url();

      for (const link of ['Threats', 'Mitigations', 'Assumptions', 'Application info']) {
        await navigateBySideNav(page, link);
        expect(page.url(), `navigating to "${link}" must not touch window.location`).toBe(
          initialUrl,
        );
      }

      // Content did change, so this is not a false pass from nothing happening.
      await navigateBySideNav(page, 'Threats');
      await expect(page.getByRole('heading', { name: /^Threats \(\d+\)/ })).toBeVisible();
    });

    test('a reload resets the router to the first screen', async ({ page }) => {
      await bootVariant(page);
      await navigateBySideNav(page, 'Threats');
      await expect(page.getByRole('heading', { name: /^Threats \(\d+\)/ })).toBeVisible();

      await page.reload();
      await expect(sideNav(page).getByText('Dashboard', { exact: true }).first()).toBeVisible();

      // A MemoryRouter keeps no history across a document load, so the threats
      // screen must be gone.
      await expect(
        page.getByRole('heading', { name: /^Threats \(\d+\)/ }),
        'memory router state should not survive a reload',
      ).toHaveCount(0);
    });

    test('the workspace switcher is absent (singleton mode)', async ({ page }) => {
      await bootVariant(page);
      // WorkspaceSelector gets singletonMode for both extension variants, so the
      // multi-workspace picker the website shows must not be here.
      await expect(page.locator('#WorkspacesSelect')).toHaveCount(0);
    });

    test('the threat model report hides the print and download actions', async ({ page }) => {
      await bootVariant(page);
      await navigateBySideNav(page, 'Threat model');

      // showPrintDownloadButtons is false for both extension variants.
      await expect(page.getByRole('button', { name: /^Print/ })).toHaveCount(0);
      await expect(page.getByRole('button', { name: /^Download/ })).toHaveCount(0);
      // But the report itself is there and still offers the markdown copy.
      await expect(page.getByRole('button', { name: 'Copy as Markdown' })).toBeVisible();
    });

    test('a threat can be created by clicking through', async ({ page }) => {
      await bootVariant(page);
      await navigateBySideNav(page, 'Threats');
      await expect(page.getByRole('heading', { name: /^Threats \(0\)/ })).toBeVisible();

      await addThreatByClicking(page);
    });
  });
}

export { test, expect, cs };

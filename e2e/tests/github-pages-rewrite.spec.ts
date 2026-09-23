/** *******************************************************************************************************************
  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
  SPDX-License-Identifier: Apache-2.0
 ******************************************************************************************************************** */
import { test, expect, allowConsoleError } from '../fixtures/console-guard';
import { waitForAppShell } from '../fixtures/app';

/**
 * GitHub Pages deep-link recovery.
 *
 * On a GitHub Pages project site a direct hit to a client-side route 404s.
 * `public/404.html` rewrites the URL into `<base>/?/workspaces/...` (encoding `&`
 * as `~and~`) so index.html can load, and `initialWorkspaceLoader` reconstructs
 * the original path and redirects to it.
 *
 * This needs a build made with VITE_GITHUB_PAGES=true, and a server that returns
 * a real 404 for unknown paths — `vite preview` and `serve -s` both fall back to
 * index.html, which masks the very behaviour under test. `scripts/serve-github-pages.mjs`
 * mimics GitHub Pages properly.
 *
 * Full setup:
 *
 *   PUBLIC_URL=/threat-composer \
 *     VITE_ROUTE_BASE_PATH=/threat-composer \
 *     VITE_GITHUB_PAGES=true \
 *     npx vite build --outDir build/website-ghpages
 *     # run from packages/threat-composer-app
 *
 *   node scripts/serve-github-pages.mjs \
 *     ../packages/threat-composer-app/build/website-ghpages --port 5050
 *     # run from e2e/
 *
 *   TC_GITHUB_PAGES=1 TC_BASE_URL=http://localhost:5050 \
 *     npx playwright test github-pages-rewrite
 *
 * Without that setup the tests skip rather than giving a false pass.
 */
const ENABLED = process.env.TC_GITHUB_PAGES === '1';
const BASE_PATH = process.env.TC_ROUTE_BASE_PATH ?? '/threat-composer';

test.describe('GitHub Pages deep-link rewrite', () => {
  test.skip(!ENABLED, 'Set TC_GITHUB_PAGES=1 against a VITE_GITHUB_PAGES build');

  test('a rewritten ?/... URL is reconstructed into the real route', async ({ page }) => {
    // The second half of the chain: what 404.html hands back to the app.
    await page.goto(`${BASE_PATH}/?/workspaces/default/threats`);

    await expect(page).toHaveURL(/\/workspaces\/default\/threats$/);
    await waitForAppShell(page);
    await expect(page.getByRole('heading', { name: /^Threats \(\d+\)/ })).toBeVisible();
  });

  for (const route of ['threats', 'threatModel', 'mitigations']) {
    test(`a direct deep link to "${route}" recovers end to end`, async ({ page }) => {
      // The FULL chain, which the previous version of this spec never exercised:
      // real 404 -> 404.html -> ?/ rewrite -> reconstructed route.
      //
      // The first request genuinely 404s — that IS the trigger — so the browser
      // logs a failed-resource error. Allow exactly that one, and nothing else:
      // the successful reload afterwards must still be clean.
      allowConsoleError(page, /Failed to load resource:.*404/i);

      const target = `/workspaces/default/${route}`;

      await page.goto(`${BASE_PATH}${target}`);

      // 404.html replaces the location; wait for the reconstruction to land.
      await page.waitForURL(new RegExp(`${target}$`), { timeout: 30_000 });
      await waitForAppShell(page);
      await expect(page).toHaveURL(new RegExp(`^http://[^/]+${BASE_PATH}${target}$`));
    });
  }

  test('assets are served from the configured base path', async ({ page }) => {
    // A wrong `base` would leave the app unstyled and scriptless on Pages.
    await page.goto(`${BASE_PATH}/`);
    await waitForAppShell(page);

    const scriptSrc = await page.evaluate(() =>
      Array.from(document.querySelectorAll('script[src]')).map((s) => s.getAttribute('src')),
    );
    expect(scriptSrc.some((src) => src?.startsWith(`${BASE_PATH}/static/js/`))).toBe(true);
  });
});

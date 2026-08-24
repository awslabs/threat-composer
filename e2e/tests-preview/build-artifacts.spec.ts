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

import { test, expect } from '../fixtures/console-guard';

/**
 * The production build deliberately keeps CRA's static/{js,css,media} layout
 * (the browser extension's copy step matches on those paths). This asserts the
 * built index.html references that layout and that the entry chunk is served.
 * Runs against `vite preview` (build/website).
 */
test.describe('production build artifacts', () => {
  test('index.html references the static/{js,css} layout and the entry chunk loads', async ({
    page,
  }) => {
    const indexRes = await page.request.get('/');
    expect(indexRes.status()).toBe(200);
    const html = await indexRes.text();

    // Entry / chunks live under static/js per vite.config.ts rollupOptions.
    const jsMatch = html.match(/["']([^"']*static\/js\/[^"']+\.js)["']/);
    expect(jsMatch, 'index.html should reference a static/js/*.js bundle').toBeTruthy();

    const jsPath = jsMatch![1];
    const jsRes = await page.request.get(jsPath);
    expect(jsRes.status()).toBe(200);
    expect(jsRes.headers()['content-type'] ?? '').toMatch(/javascript/i);
  });

  test('renders in the browser from the production bundle', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/workspaces\/[^/]+\/dashboard/);
    // App shell mounted from the production chunks. (An empty workspace shows
    // the LandingPage rather than the Insights dashboard.)
    await expect(
      page.getByRole('navigation').getByText('Dashboard', { exact: true }).first(),
    ).toBeVisible();
    await expect(page.getByText('View an example threat model').first()).toBeVisible();
  });
});

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
import { waitForAppShell, expectOnDashboard } from '../fixtures/app';

/**
 * Boot smoke test. Proves the single most valuable thing: the app actually
 * renders in a real browser (which the migration was never verified to do) and
 * emits no console errors while doing so. This is the test that would have
 * caught `global is not defined` on its own.
 */
test.describe('app boot', () => {
  test('loads, redirects to the default workspace dashboard, and mounts the shell', async ({
    page,
  }) => {
    await page.goto('/');

    // / -> /workspaces/default -> /workspaces/default/dashboard
    await expectOnDashboard(page);
    await waitForAppShell(page);

    // #root must contain real content, not an empty div (blank-page regression).
    const rootText = await page.locator('#root').innerText();
    expect(rootText.trim().length).toBeGreaterThan(0);

    // The Cloudscape TopNavigation identity title should be present.
    await expect(page.getByText('threat-composer').first()).toBeVisible();
  });

  test('renders styled (Cloudscape global CSS side-effect import took effect)', async ({
    page,
  }) => {
    await page.goto('/');
    await waitForAppShell(page);

    // Cloudscape applies backgrounds to its own `awsui`-classed elements rather
    // than to <body>. If the side-effect CSS import was tree-shaken or failed,
    // no awsui element gets a resolved (non-transparent) background and the app
    // renders unstyled.
    const hasStyledBackground = await page.evaluate(() => {
      const transparent = new Set(['rgba(0, 0, 0, 0)', 'transparent', '']);
      const nodes = Array.from(document.querySelectorAll('[class*="awsui"]'));
      return nodes.some((el) => {
        const bg = window.getComputedStyle(el as HTMLElement).backgroundColor;
        return !transparent.has(bg);
      });
    });
    expect(hasStyledBackground).toBe(true);
  });
});

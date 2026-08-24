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

import {
  test,
  expect,
  cs,
  bootVariant,
  navigateBySideNav,
  registerSharedVariantContract,
  workspaceDataKeys,
  addThreatByClicking,
} from '../fixtures/variants';

/**
 * `vite build --mode browser-extension` -> build/browser-extension.
 *
 * This is the bundle the WXT browser extension embeds. Before this suite it had
 * ZERO runtime coverage: the build succeeding proved only that Rollup finished,
 * not that a MemoryRouter app with `VITE_APP_MODE=browser-extension` actually
 * boots and works.
 *
 * The shared contract (memory router, no service worker, every screen renders,
 * singleton workspace mode, no print/download) is asserted by
 * registerSharedVariantContract. What follows is what makes this variant
 * DIFFERENT from ide-extension.
 */
registerSharedVariantContract('browser-extension');

test.describe('browser-extension specifics', () => {
  test('offers "Export data" as its primary action, not the IDE "Save"', async ({ page }) => {
    await bootVariant(page);

    // singletonPrimaryActionButtonConfig is only supplied for ide-extension, so
    // this variant keeps the ordinary export action.
    await expect(page.getByRole('button', { name: 'Export data' })).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Save', exact: true }),
      '"Save" is the ide-extension primary action and must not appear here',
    ).toHaveCount(0);
  });

  test('keeps the theme toggle and can apply dark mode', async ({ page }) => {
    await bootVariant(page);

    const toggle = page.locator(`${cs.toggle} input[type="checkbox"]`).first();
    await expect(toggle, 'the theme toggle is hidden only for ide-extension').toHaveCount(1);

    await expect(page.locator('body')).not.toHaveClass(/awsui-dark-mode/);
    await toggle.click({ force: true });
    await expect(page.locator('body')).toHaveClass(/awsui-dark-mode/);
  });

  test('persists the theme to localStorage', async ({ page }) => {
    await bootVariant(page);
    await page.locator(`${cs.toggle} input[type="checkbox"]`).first().click({ force: true });
    await expect(page.locator('body')).toHaveClass(/awsui-dark-mode/);

    // ThemeProvider picks ThemeLocalStorageProvider for everything except
    // ide-extension, so the choice must be written down.
    expect(await page.evaluate(() => localStorage.getItem('ThreatComposer.theme.mode'))).toContain(
      'dark',
    );
  });

  test('persists workspace data to localStorage', async ({ page }) => {
    await bootVariant(page);
    await navigateBySideNav(page, 'Threats');
    await addThreatByClicking(page);

    // useWorkspaceStorage selects STORAGE_LOCAL_STORAGE for this variant.
    const keys = await workspaceDataKeys(page);
    expect(keys, 'workspace content should be written to localStorage').toContain(
      'ThreatStatementGenerator.threatStatementList',
    );

    const stored = await page.evaluate(() =>
      localStorage.getItem('ThreatStatementGenerator.threatStatementList'),
    );
    expect(stored, 'the saved threat should be in the stored list').toBeTruthy();
    expect(JSON.parse(stored ?? '[]')).toHaveLength(1);
  });

  test('survives a reload with its data intact', async ({ page }) => {
    await bootVariant(page);
    await navigateBySideNav(page, 'Threats');
    await addThreatByClicking(page);

    await page.reload();
    // The router resets to the landing screen, but the DATA must still be there.
    await navigateBySideNav(page, 'Threats');
    await expect(
      page.getByRole('heading', { name: /^Threats \(1\)/ }),
      'localStorage-backed data should survive a reload',
    ).toBeVisible();
  });
});

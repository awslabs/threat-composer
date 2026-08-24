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
  localStorageKeys,
  injectDarkModeMeta,
  addThreatByClicking,
  NEW_VISIT_FLAG,
} from '../fixtures/variants';

/**
 * `vite build --mode ide-extension` -> build/ide-extension.
 *
 * The bundle the AWS IDE toolkit webview embeds, and the variant that diverges
 * most from the website. Before this suite it had ZERO runtime coverage.
 *
 * Two divergences are worth the most:
 *  - Storage. `useWorkspaceStorage` selects STORAGE_LOCAL_STATE here instead of
 *    STORAGE_LOCAL_STORAGE, so the app must persist NOTHING. A regression that
 *    swapped the strategy back would leak a user's threat model into the browser
 *    profile of their IDE, and no build check would notice.
 *  - Theming. The host injects `<meta name="dark-mode">` to match the IDE's theme.
 *    Nothing in this repo emits that tag, only `src/index.tsx` reads it, so the
 *    reader is untested unless a test supplies the tag itself.
 */
registerSharedVariantContract('ide-extension');

test.describe('ide-extension specifics', () => {
  test('offers "Save" as its primary action instead of "Export data"', async ({ page }) => {
    await bootVariant(page);

    // singletonPrimaryActionButtonConfig is supplied only for this variant, so the
    // host gets a Save hook instead of a file export.
    await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Export data' }),
      '"Export data" is replaced by the host Save action here',
    ).toHaveCount(0);
  });

  test('hides the theme toggle, because the IDE owns the theme', async ({ page }) => {
    await bootVariant(page);

    await expect(
      page.locator(`${cs.toggle} input[type="checkbox"]`),
      'WorkspaceSelector gates the toggle on appMode !== ide-extension',
    ).toHaveCount(0);
  });

  test('persists NOTHING about the workspace to localStorage', async ({ page }) => {
    await bootVariant(page);
    await navigateBySideNav(page, 'Threats');
    await addThreatByClicking(page);

    // The threat exists in the running app...
    await expect(page.getByRole('heading', { name: /^Threats \(1\)/ })).toBeVisible();

    // ...but STORAGE_LOCAL_STATE means it must not reach the browser profile.
    expect(
      await workspaceDataKeys(page),
      'ide-extension must keep workspace content in memory only',
    ).toEqual([]);

    // The only key the app is allowed to write is the first-visit flag.
    const keys = await localStorageKeys(page);
    expect(keys.filter((k) => k.startsWith('ThreatStatementGenerator.'))).toEqual([NEW_VISIT_FLAG]);
  });

  test('loses its data on reload, which is the point of local-state storage', async ({ page }) => {
    await bootVariant(page);
    await navigateBySideNav(page, 'Threats');
    await addThreatByClicking(page);

    await page.reload();
    await navigateBySideNav(page, 'Threats');
    await expect(
      page.getByRole('heading', { name: /^Threats \(0\)/ }),
      'nothing was persisted, so the reloaded app starts empty',
    ).toBeVisible();
  });

  test('applies dark mode from the host meta tag', async ({ page }) => {
    await injectDarkModeMeta(page, 'true');
    await bootVariant(page);

    await expect(
      page.locator('meta[name="dark-mode"]'),
      'the injected tag should have survived into the document',
    ).toHaveCount(1);
    await expect(page.locator('body')).toHaveClass(/awsui-dark-mode/);
  });

  test('stays light when the host meta tag says false', async ({ page }) => {
    await injectDarkModeMeta(page, 'false');
    await bootVariant(page);

    await expect(page.locator('body')).not.toHaveClass(/awsui-dark-mode/);
  });

  test('defaults to light when the host supplies no meta tag', async ({ page }) => {
    await bootVariant(page);

    await expect(page.locator('meta[name="dark-mode"]')).toHaveCount(0);
    await expect(page.locator('body')).not.toHaveClass(/awsui-dark-mode/);
  });

  test('does not persist the theme, so the host stays authoritative', async ({ page }) => {
    await injectDarkModeMeta(page, 'true');
    await bootVariant(page);
    await expect(page.locator('body')).toHaveClass(/awsui-dark-mode/);

    // ThemeProvider uses ThemeLocalStateProvider here, so a stored value can never
    // beat the host's tag on the next boot.
    expect(
      await page.evaluate(() => localStorage.getItem('ThreatComposer.theme.mode')),
      'the theme must not be written to localStorage in the IDE build',
    ).toBeNull();
  });
});

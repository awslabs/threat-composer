/** *******************************************************************************************************************
  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
  SPDX-License-Identifier: Apache-2.0
 ******************************************************************************************************************** */
import { test, expect } from '../fixtures/console-guard';
import { gotoWorkspace, navigateVia, waitForAppShell } from '../fixtures/app';
import { cs } from '../fixtures/cloudscape';
import { DEFAULT_WORKSPACE } from '../fixtures/routes';

/**
 * Dark mode.
 *
 * Worth covering beyond "a toggle exists": the theme is applied by calling
 * Cloudscape's `applyMode(Mode.Dark)`, where `Mode` is a runtime enum imported
 * from `@cloudscape-design/global-styles`. That makes it a member of exactly the
 * class of value that the migration's 264-file `import type` codemod could have
 * erased — an erased enum fails at the point of use, which here is the moment a
 * user flips the switch, long after any build check has passed.
 *
 * The choice is also persisted, so it has to survive a reload.
 */
const themeToggle = (page: import('@playwright/test').Page) =>
  page.locator(`${cs.toggle} input[type="checkbox"]`).first();

test.describe('dark mode', () => {
  test('toggling applies the dark theme to the document', async ({ page }) => {
    await gotoWorkspace(page, DEFAULT_WORKSPACE, 'dashboard');

    // Light by default: Cloudscape marks dark mode with a class on <body>.
    await expect(page.locator('body')).not.toHaveClass(/awsui-dark-mode/);

    const toggle = themeToggle(page);
    await expect(toggle).toHaveCount(1);
    await toggle.click({ force: true });

    // applyMode(Mode.Dark) ran — this is the assertion that an erased enum breaks.
    await expect(page.locator('body')).toHaveClass(/awsui-dark-mode/);
  });

  test('the choice persists across a reload', async ({ page }) => {
    await gotoWorkspace(page, DEFAULT_WORKSPACE, 'dashboard');
    await themeToggle(page).click({ force: true });
    await expect(page.locator('body')).toHaveClass(/awsui-dark-mode/);

    expect(
      await page.evaluate(() => localStorage.getItem('ThreatComposer.theme.mode')),
      'the theme should be written to localStorage',
    ).toContain('dark');

    await page.reload();
    await waitForAppShell(page);
    await expect(
      page.locator('body'),
      'dark mode should still be applied after a reload',
    ).toHaveClass(/awsui-dark-mode/);
  });

  test('toggling back restores light mode', async ({ page }) => {
    await gotoWorkspace(page, DEFAULT_WORKSPACE, 'dashboard');
    const toggle = themeToggle(page);

    await toggle.click({ force: true });
    await expect(page.locator('body')).toHaveClass(/awsui-dark-mode/);

    await toggle.click({ force: true });
    await expect(page.locator('body')).not.toHaveClass(/awsui-dark-mode/);
    expect(await page.evaluate(() => localStorage.getItem('ThreatComposer.theme.mode'))).toContain(
      'light',
    );
  });

  test('dark mode survives navigation and still renders content', async ({ page }) => {
    await gotoWorkspace(page, DEFAULT_WORKSPACE, 'dashboard');
    await themeToggle(page).click({ force: true });

    // A themed app that renders nothing is not much use, so check a couple of
    // routes still produce their own content while dark.
    await navigateVia(page, 'Threats');
    await expect(page.locator('body')).toHaveClass(/awsui-dark-mode/);
    await expect(page.getByRole('heading', { name: /^Threats \(\d+\)/ })).toBeVisible();

    await navigateVia(page, 'Application info');
    await expect(page.locator('body')).toHaveClass(/awsui-dark-mode/);
    await expect(page.getByRole('heading', { name: 'Application information' })).toBeVisible();
  });
});

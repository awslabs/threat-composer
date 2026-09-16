/** *******************************************************************************************************************
  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
  SPDX-License-Identifier: Apache-2.0
 ******************************************************************************************************************** */
import {
  test,
  expect,
  extensionUrl,
  clearStorage,
  readStorage,
  seedConfig,
} from '../fixtures/extension';
import { cs } from '../fixtures/cloudscape';

/**
 * The extension shell: it loads as a real Chromium extension, its MV3 service
 * worker starts, its popup config UI works, and the threat-composer viewer it
 * bundles boots.
 *
 * Everything here runs against the actual built `.output/chrome-mv3`, loaded with
 * `--load-extension`. Before this suite the whole package had no tests at all —
 * `vitest run --passWithNoTests` — so nothing verified the extension even
 * installed.
 */

const INTEGRATION_LABELS = [
  'Amazon Code',
  'Amazon CodeCatalyst',
  'Bitbucket',
  'GitHub',
  'GitLab',
];

const integrationToggle = (page: import('@playwright/test').Page, label: string) =>
  page
    .locator(cs.toggle)
    .filter({ hasText: new RegExp(`^${label}$`) })
    .first()
    .locator('input[type="checkbox"]');

test.describe('extension install', () => {
  test('loads with a running MV3 service worker and a resolvable id', async ({
    context,
    background,
    extensionId,
  }) => {
    expect(context.serviceWorkers().length).toBeGreaterThan(0);
    // Chromium derives the id of an unpacked extension from its path, so assert the
    // shape rather than a fixed value.
    expect(extensionId).toMatch(/^[a-p]{32}$/);
    expect(background.url()).toBe(`chrome-extension://${extensionId}/background.js`);
  });

  test('bundles the threat-composer viewer, and it boots', async ({ context, extensionId }) => {
    const viewer = await context.newPage();
    const errors: string[] = [];
    viewer.on('pageerror', (e) => errors.push(e.message));

    await viewer.goto(extensionUrl(extensionId, 'index.html'));

    // The viewer is the browser-extension variant of the app, so it shows the
    // landing page for an empty workspace.
    await expect(viewer.getByRole('heading', { name: 'Threat Composer' })).toBeVisible();
    expect(errors).toEqual([]);
    await viewer.close();
  });
});

test.describe('popup config UI', () => {
  test.beforeEach(async ({ background }) => {
    await clearStorage(background);
  });

  test('renders every integration toggle plus the debug and reset controls', async ({
    extensionId,
    page,
  }) => {
    await page.goto(extensionUrl(extensionId, 'popup.html'));

    await expect(page.getByRole('heading', { name: 'Integrations' })).toBeVisible();
    for (const label of INTEGRATION_LABELS) {
      await expect(integrationToggle(page, label), `${label} toggle`).toHaveCount(1);
    }

    await expect(page.getByRole('heading', { name: 'Debug' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Restore defaults' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'GitHub Project' })).toBeVisible();
  });

  test('every integration ships enabled by default', async ({ extensionId, page }) => {
    await page.goto(extensionUrl(extensionId, 'popup.html'));
    await expect(page.getByRole('heading', { name: 'Integrations' })).toBeVisible();

    for (const label of INTEGRATION_LABELS) {
      await expect(integrationToggle(page, label), `${label} default`).toBeChecked();
    }
  });

  test('turning an integration off persists to extension storage', async ({
    background,
    extensionId,
    page,
  }) => {
    await page.goto(extensionUrl(extensionId, 'popup.html'));
    const toggle = integrationToggle(page, 'GitHub');
    await expect(toggle).toBeChecked();

    await toggle.click({ force: true });
    await expect(toggle).not.toBeChecked();

    // The content script reads this on every page load, so persistence is the
    // whole point of the control.
    await expect
      .poll(async () => {
        const config = await readStorage<{ integrations: Record<string, { enabled: boolean }> }>(
          background,
          'tcConfig',
        );
        return config?.integrations?.github?.enabled;
      })
      .toBe(false);
  });

  test('the debug toggle persists too', async ({ background, extensionId, page }) => {
    await page.goto(extensionUrl(extensionId, 'popup.html'));
    const debugToggle = page
      .locator(cs.toggle)
      .filter({ hasText: 'Debug mode' })
      .first()
      .locator('input[type="checkbox"]');

    await expect(debugToggle).not.toBeChecked();
    await debugToggle.click({ force: true });

    await expect
      .poll(async () => (await readStorage<{ debug: boolean }>(background, 'tcConfig'))?.debug)
      .toBe(true);
  });

  test('Restore defaults puts a disabled integration back', async ({
    background,
    extensionId,
    page,
  }) => {
    await page.goto(extensionUrl(extensionId, 'popup.html'));
    await integrationToggle(page, 'GitLab').click({ force: true });
    await expect(integrationToggle(page, 'GitLab')).not.toBeChecked();

    await page.getByRole('button', { name: 'Restore defaults' }).click();

    await expect(integrationToggle(page, 'GitLab')).toBeChecked();
    await expect
      .poll(async () => {
        const config = await readStorage<{ integrations: Record<string, { enabled: boolean }> }>(
          background,
          'tcConfig',
        );
        return config?.integrations?.gitlab?.enabled;
      })
      .toBe(true);
  });
});

test.describe('per-integration settings', () => {
  test.beforeEach(async ({ background }) => {
    await clearStorage(background);
  });

  test('the settings button opens the detail view with the shipped patterns', async ({
    extensionId,
    page,
  }) => {
    await page.goto(extensionUrl(extensionId, 'popup.html'));
    await expect(page.getByRole('heading', { name: 'Integrations' })).toBeVisible();

    // Reached by clicking, not by URL: the popup uses a normal router, so
    // popup.html#/integration/github does NOT navigate. Verified.
    await page.getByRole('button', { name: 'GitHub settings' }).click();

    await expect(page.getByRole('heading', { name: 'GitHub integration' })).toBeVisible();
    await expect(page.getByText('URL Matching Patterns')).toBeVisible();
    await expect(page.getByText('Raw File Detection Patterns')).toBeVisible();

    // The GitHub defaults, straight from DefaultConfig.
    await expect(page.getByText('github.com', { exact: true })).toBeVisible();
    await expect(page.getByText('raw.githubusercontent.com', { exact: true })).toBeVisible();
  });

  test('each integration has its own reachable settings view', async ({ extensionId, page }) => {
    for (const label of INTEGRATION_LABELS) {
      await page.goto(extensionUrl(extensionId, 'popup.html'));
      await expect(page.getByRole('heading', { name: 'Integrations' })).toBeVisible();

      await page.getByRole('button', { name: `${label} settings` }).click();
      await expect(
        page.getByRole('heading', { name: new RegExp(`integration$`) }),
        `${label} should open a detail view`,
      ).toBeVisible();
    }
  });
});

test.describe('known defect', () => {
  /**
   * `getExtensionConfig()` returns whatever is in storage verbatim — there is no
   * merge against DefaultConfig and no migration. So a config written by an older
   * version (or any partial write) that lacks `integrations` makes `ConfigView`
   * throw on `config.integrations[TYPE].enabled` during render, and the popup
   * paints nothing at all.
   *
   * Recorded rather than asserted-as-correct: the popup SHOULD fall back to
   * defaults. Note this also fails silently — no console error, no pageerror, just
   * an empty body — which is why it is worth pinning.
   */
  test('a partial stored config renders an empty popup', async ({
    background,
    extensionId,
    page,
  }) => {
    await clearStorage(background);
    await seedConfig(background, { debug: true });

    await page.goto(extensionUrl(extensionId, 'popup.html'));
    // Give React the same amount of time a healthy render would need.
    await expect(page.locator('#root')).toBeAttached();
    await page.waitForTimeout(2000);

    expect(
      (await page.locator('body').innerText()).trim(),
      'if this is no longer empty, getExtensionConfig has gained a defaults merge — ' +
        'delete this test and assert the fallback instead',
    ).toBe('');
  });
});

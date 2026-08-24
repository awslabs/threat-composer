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
  blobUrl,
  rawFileUrl,
  clearStorage,
  configForPlatform,
  expectButtonEnabled,
  extensionUrl,
  readStorage,
  seedConfig,
  tcButton,
  TC_BUTTON_TEXT,
  FIXTURE_ORIGIN,
  type Platform,
} from '../fixtures/extension';

/**
 * The content script, exercised as a real extension against fake code-host pages.
 *
 * This is the part of the extension with actual logic and it had no coverage of
 * any kind. The pipeline under test is four hops:
 *
 *   content script matches the URL
 *     -> finds that host's "Raw" control and injects a disabled button
 *     -> asks the BACKGROUND service worker to fetch the raw file
 *     -> enables the button only if the JSON carries a `schema` key
 *   then, on click: background stores the model and opens the bundled viewer
 *
 * Each platform gets its own DOM shape and its own raw-URL derivation, so all four
 * are covered separately — a change to any one handler's selector strategy breaks
 * only its own test.
 *
 * The fixture server (scripts/serve-extension-fixtures.mjs) is real rather than a
 * `page.route` stub because the raw fetch happens in the service worker, which
 * `page.route` cannot intercept.
 */

const PLATFORMS: Platform[] = ['github', 'gitlab', 'bitbucket', 'amazoncode'];

test.describe('button injection per platform', () => {
  test.beforeEach(async ({ background }) => {
    await clearStorage(background);
  });

  for (const platform of PLATFORMS) {
    test(`${platform}: injects the button and enables it for a real threat model`, async ({
      background,
      page,
    }) => {
      await seedConfig(background, configForPlatform(platform));

      await page.goto(blobUrl(platform));

      const button = tcButton(page).first();
      await expect(button, 'the extension should inject its button').toBeVisible();
      await expect(button).toHaveText(TC_BUTTON_TEXT);

      // Enabled only after the background fetch returns JSON with a `schema` key.
      await expectButtonEnabled(page, true);
    });
  }

  test('a raw file view gets a button prepended to the page', async ({ background, page }) => {
    await seedConfig(background, configForPlatform('github'));

    // The raw path does not fetch: it reads the JSON straight out of the <pre>.
    await page.goto(rawFileUrl());

    await expect(tcButton(page).first()).toHaveText(TC_BUTTON_TEXT);
    await expectButtonEnabled(page, true);
  });
});

test.describe('the extension stays out of the way when it should', () => {
  test.beforeEach(async ({ background }) => {
    await clearStorage(background);
  });

  test('a file that is not .tc.json gets no button', async ({ background, page }) => {
    await seedConfig(background, configForPlatform('github'));

    await page.goto(blobUrl('github', 'notes.md'));

    // Every handler gates on matchesFileExtension() before doing anything.
    await expect(page.locator('.repository-content')).toBeVisible();
    await expect(tcButton(page)).toHaveCount(0);
  });

  test('an out-of-scope origin gets no button', async ({ background, page }) => {
    // Scope the integration to a host the fixture server is not on.
    await seedConfig(background, {
      ...configForPlatform('github'),
      integrations: {
        ...configForPlatform('github').integrations,
        github: {
          name: 'GitHub',
          enabled: true,
          urlRegexes: ['example\\.invalid'],
          rawUrlPatterns: [],
        },
      },
    });

    await page.goto(blobUrl('github'));

    await expect(page.locator('.repository-content')).toBeVisible();
    await expect(tcButton(page)).toHaveCount(0);
  });

  test('a disabled integration gets no button', async ({ background, page }) => {
    const config = configForPlatform('github');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (config.integrations as any).github.enabled = false;
    await seedConfig(background, config);

    await page.goto(blobUrl('github'));

    await expect(page.locator('.repository-content')).toBeVisible();
    await expect(tcButton(page)).toHaveCount(0);
  });

  test('JSON without a schema key leaves the button disabled', async ({ background, page }) => {
    await seedConfig(background, configForPlatform('github'));

    await page.goto(blobUrl('github', 'invalid.tc.json'));

    // The button still appears — the extension cannot know until it has fetched —
    // but it must never become clickable.
    await expect(tcButton(page).first()).toBeVisible();
    await expectButtonEnabled(page, false);
  });

  test('content that is not JSON at all leaves the button disabled', async ({
    background,
    page,
  }) => {
    await seedConfig(background, configForPlatform('github'));

    await page.goto(blobUrl('github', 'notjson.tc.json'));

    await expect(tcButton(page).first()).toBeVisible();
    await expectButtonEnabled(page, false);
  });
});

test.describe('opening a threat model', () => {
  test.beforeEach(async ({ background }) => {
    await clearStorage(background);
  });

  test('clicking the button stores the model and opens the bundled viewer', async ({
    context,
    background,
    extensionId,
    page,
  }) => {
    await seedConfig(background, configForPlatform('github'));
    await page.goto(blobUrl('github'));
    await expectButtonEnabled(page, true);

    const opened = context.waitForEvent('page');
    await tcButton(page).first().click();
    const viewer = await opened;

    // background.ts writes the model, then creates (or reuses) a viewer tab.
    expect(viewer.url()).toBe(extensionUrl(extensionId, 'index.html'));

    const stored = await readStorage<{ schema: number; applicationInfo?: { name?: string } }>(
      background,
      'threatModel',
    );
    expect(stored?.schema).toBe(1);
    expect(stored?.applicationInfo?.name).toBe('Extension fixture model');
  });

  test('the viewer actually loads the model, not just an empty workspace', async ({
    context,
    background,
    page,
  }) => {
    await seedConfig(background, configForPlatform('github'));
    await page.goto(blobUrl('github'));
    await expectButtonEnabled(page, true);

    const opened = context.waitForEvent('page');
    await tcButton(page).first().click();
    const viewer = await opened;

    // scriptInjectForThreatComposer.js waits for window.threatcomposer to appear,
    // reads storage.local.threatModel and calls setCurrentWorkspaceData. The proof
    // it worked is the Insights dashboard: an EMPTY workspace renders the landing
    // page instead, so this heading only appears once content was imported.
    await expect(
      viewer.getByRole('heading', { name: 'Insights dashboard' }),
      'the imported model should populate the workspace',
    ).toBeVisible();
    await expect(viewer.getByRole('heading', { name: 'Threat summary' })).toBeVisible();
  });

  test('a second model reuses the existing viewer tab instead of piling up', async ({
    context,
    background,
    page,
  }) => {
    await seedConfig(background, configForPlatform('github'));

    await page.goto(blobUrl('github'));
    await expectButtonEnabled(page, true);
    const opened = context.waitForEvent('page');
    await tcButton(page).first().click();
    await opened;

    const pagesAfterFirst = context.pages().length;

    // background.ts queries for a tab already on the extension origin and updates
    // it rather than creating another.
    await page.bringToFront();
    await page.reload();
    await expectButtonEnabled(page, true);
    await tcButton(page).first().click();
    await page.waitForTimeout(3000);

    expect(
      context.pages().length,
      'the extension should reuse its viewer tab, not open a new one each click',
    ).toBe(pagesAfterFirst);
  });
});

test.describe('configuration drives matching', () => {
  test.beforeEach(async ({ background }) => {
    await clearStorage(background);
  });

  test('a custom urlRegex brings a non-standard host into scope', async ({ background, page }) => {
    // The shipped defaults only cover the real code hosts, so this is the setting a
    // user with self-hosted GitLab would reach for.
    await seedConfig(background, configForPlatform('gitlab'));

    await page.goto(blobUrl('gitlab'));

    await expect(tcButton(page).first()).toBeVisible();
    await expectButtonEnabled(page, true);
  });

  test('a custom fileExtension is honoured', async ({ background, page }) => {
    await seedConfig(background, {
      ...configForPlatform('github'),
      fileExtension: '\\.threats\\.json',
    });

    // A .tc.json file must now be ignored...
    await page.goto(blobUrl('github'));
    await expect(page.locator('.repository-content')).toBeVisible();
    await expect(tcButton(page)).toHaveCount(0);

    // ...while the configured extension is picked up.
    await page.goto(`${FIXTURE_ORIGIN}/github/blob/model.threats.json`);
    await expect(tcButton(page).first()).toBeVisible();
  });
});

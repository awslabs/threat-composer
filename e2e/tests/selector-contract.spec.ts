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
import { addSimpleEntity, gotoWorkspace, waitForAppShell } from '../fixtures/app';
import { cs } from '../fixtures/cloudscape';
import { CARD, byTooltip, workspaceSelect } from '../fixtures/selectors';
import { DEFAULT_WORKSPACE } from '../fixtures/routes';

/**
 * Canary for the handful of structural selectors the suite cannot express through
 * roles, labels or text.
 *
 * Almost all of the suite matches on accessible names and visible text, which are
 * stable across builds. The exceptions are listed here. If a dependency upgrade
 * or a refactor changes any of these shapes, THIS test fails with an explicit
 * message — instead of the change surfacing as dozens of unrelated timeouts that
 * take an afternoon to trace back to a selector.
 *
 * If you are here because this test failed: the selector contract moved. Fix the
 * definition in fixtures/cloudscape.ts or fixtures/selectors.ts, do not weaken
 * the tests that depend on it.
 */
test.describe('selector contract', () => {
  test('Cloudscape selectors resolve to real elements', async ({ page }) => {
    await gotoWorkspace(page, DEFAULT_WORKSPACE, 'threats');

    // Sanity-check the shape of what Cloudscape's API handed us, so a change in
    // that API is distinguishable from a change in the app. `tableRowSelection` is
    // parameterised by row, so it is resolved before checking.
    const resolved = Object.entries(cs).map(
      ([name, value]) => [name, typeof value === 'function' ? value(1) : value] as const,
    );

    for (const [name, selector] of resolved) {
      expect(selector, `Cloudscape selector "${name}" should be a non-empty string`).toMatch(/\S/);
      expect(
        selector,
        `Cloudscape selector "${name}" should be scopable (the leading "body " must be stripped)`,
      ).not.toMatch(/^body\s/);
    }

    // The threats page has containers (the filter panel), a text filter, and
    // multiselect filters. If Cloudscape renamed these internals, these fail.
    await expect(page.locator(cs.container).first(), 'Container selector matched nothing').toBeVisible();
    await expect(page.locator(cs.multiselect).first(), 'Multiselect selector matched nothing').toBeVisible();
    await expect(page.locator(cs.select).first(), 'Select selector matched nothing').toBeVisible();
  });

  test('entity cards are addressable and expose their action buttons', async ({ page }) => {
    await gotoWorkspace(page, DEFAULT_WORKSPACE, 'assumptions');
    await addSimpleEntity(page, 'assumption', 'Selector contract probe.');

    // The card-scoping strategy: a Cloudscape Container narrowed by its heading.
    const card = page
      .locator(CARD)
      .filter({ has: page.getByRole('heading', { name: /^Assumption 1\b/ }) });
    await expect(card, 'card scoping (Container + heading filter) resolved no unique card').toHaveCount(1);

    // Card action buttons are icon-only with NO text and NO aria-label; the only
    // handle is the library's own Tooltip, which renders
    // <span><button/><span class="tooltipText">…</span></span>.
    // `.tooltipText` is defined in this repo (generic/Tooltip), not by Cloudscape.
    await expect(
      byTooltip(card, 'Edit'),
      'the .tooltipText hook for card action buttons has changed',
    ).toHaveCount(1);
    await expect(byTooltip(card, 'Remove From Workspace')).toHaveCount(1);
  });

  test('repo-owned hooks still exist', async ({ page }) => {
    await gotoWorkspace(page, DEFAULT_WORKSPACE, 'dashboard');

    // #root is the React mount point in index.html.
    await expect(page.locator('#root'), '#root mount point missing').toHaveCount(1);
    // #WorkspacesSelect comes from an explicit controlId on the workspace Select.
    await expect(
      workspaceSelect(page),
      'the WorkspacesSelect controlId has changed or been removed',
    ).toHaveCount(1);
  });

  test('the unlabelled entity textareas have accessible names', async ({ page }) => {
    // These fields are visually unlabelled. The library gives them accessible
    // names so the suite does not have to select them by position — and so screen
    // reader users get a usable form. If these disappear, both regress together.
    await gotoWorkspace(page, DEFAULT_WORKSPACE, 'assumptions');
    await page.getByRole('button', { name: 'Add new assumption' }).click();
    await expect(
      page.getByLabel('Assumption content', { exact: true }),
      'the assumption creation textarea lost its accessible name',
    ).toBeVisible();

    await gotoWorkspace(page, DEFAULT_WORKSPACE, 'mitigations');
    await page.getByRole('button', { name: 'Add new mitigation' }).click();
    await expect(
      page.getByLabel('Mitigation content', { exact: true }),
      'the mitigation creation textarea lost its accessible name',
    ).toBeVisible();
  });

  test('the markdown editor hook still resolves', async ({ page }) => {
    // MDXEditor is third-party; its class prefix is unhashed, and the editable
    // region is a contenteditable div rather than a form control.
    await gotoWorkspace(page, DEFAULT_WORKSPACE, 'application');
    await waitForAppShell(page);
    await expect(page.locator('[contenteditable="true"]').first()).toBeVisible();
  });
});

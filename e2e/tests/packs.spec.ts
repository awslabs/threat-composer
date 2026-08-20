/** *******************************************************************************************************************
  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
  SPDX-License-Identifier: Apache-2.0
 ******************************************************************************************************************** */
import { test, expect } from '../fixtures/console-guard';
import {
  addPackRowsToWorkspace,
  gotoWorkspace,
  navigateVia,
  waitForAppShell,
  workspacePath,
} from '../fixtures/app';
import { DEFAULT_WORKSPACE, PACK_ID } from '../fixtures/routes';

/**
 * Reference packs are the bulk-import path: a user pulls curated threats or
 * mitigation candidates into their workspace instead of writing them by hand.
 * The pack data is static JSON compiled into the bundle, so these tests also
 * verify that the generated pack modules actually shipped.
 */
test.describe('threat packs', () => {
  test('the list page shows the pack and links to its detail', async ({ page }) => {
    await gotoWorkspace(page, DEFAULT_WORKSPACE, 'threatPacks');

    await expect(page.getByRole('heading', { name: /^Threat Packs \(1\)/ })).toBeVisible();
    for (const column of ['Id', 'Name', 'Description', 'Total threats', 'Referenced threats']) {
      await expect(page.getByRole('columnheader', { name: column })).toBeVisible();
    }

    // The Id cell is a link-style button, which is how a user reaches the detail.
    await page.getByRole('button', { name: PACK_ID, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/threatPacks/${PACK_ID}$`));
    await expect(page.getByRole('heading', { name: /^Threat Pack - / })).toBeVisible();
  });

  test('the detail page lists the pack contents', async ({ page }) => {
    await page.goto(workspacePath(`threatPacks/${PACK_ID}`));
    await waitForAppShell(page);

    await expect(
      page.getByRole('heading', { name: 'Threat Pack - GenAI ChatBot Threat Pack' }),
    ).toBeVisible();
    // The pack ships 37 threats; assert the count is rendered rather than the
    // exact number, so adding threats upstream does not break the test.
    await expect(page.getByRole('heading', { name: /^Threats \(\d+\)/ })).toBeVisible();

    for (const column of [
      'Threat',
      'Threat source',
      'Prerequisites',
      'Threat impact',
      'Threat action',
      'Impacted goal',
      'Impacted assets',
      'Actions',
    ]) {
      await expect(page.getByRole('columnheader', { name: column, exact: true })).toBeVisible();
    }
  });

  test('selected threats are added to the workspace and then locked', async ({ page }) => {
    await page.goto(workspacePath(`threatPacks/${PACK_ID}`));
    await waitForAppShell(page);

    await addPackRowsToWorkspace(page, 3);

    // Selection is cleared after a successful add.
    await expect(page.getByRole('button', { name: 'Add to workspace' })).toBeDisabled();

    await navigateVia(page, 'Threats');
    await expect(page.getByRole('heading', { name: /^Threats \(3\)/ })).toBeVisible();

    // Re-visiting the pack shows the imported rows as already used: pre-checked
    // and disabled, so the same threat cannot be imported twice.
    await page.goto(workspacePath(`threatPacks/${PACK_ID}`));
    await waitForAppShell(page);

    const checkedRows = page.locator('table tbody input[type="checkbox"]:checked');
    await expect(checkedRows).toHaveCount(3);
    await expect(checkedRows.first()).toBeDisabled();
  });

  test('the referenced count on the list page reflects what was imported', async ({ page }) => {
    await page.goto(workspacePath(`threatPacks/${PACK_ID}`));
    await waitForAppShell(page);
    await addPackRowsToWorkspace(page, 2);

    await gotoWorkspace(page, DEFAULT_WORKSPACE, 'threatPacks');
    // "Referenced threats" is the count already pulled into this workspace.
    const row = page.locator('table tbody tr').first();
    await expect(row).toContainText('2');
  });
});

test.describe('mitigation packs', () => {
  test('the list page shows the pack and its columns', async ({ page }) => {
    await gotoWorkspace(page, DEFAULT_WORKSPACE, 'mitigationPacks');

    await expect(page.getByRole('heading', { name: /^Mitigation Packs \(1\)/ })).toBeVisible();
    for (const column of [
      'Id',
      'Name',
      'Description',
      'Total mitigations',
      'Referenced mitigations',
    ]) {
      await expect(page.getByRole('columnheader', { name: column })).toBeVisible();
    }
  });

  test('selected mitigation candidates are added to the workspace', async ({ page }) => {
    await page.goto(workspacePath(`mitigationPacks/${PACK_ID}`));
    await waitForAppShell(page);

    await expect(
      page.getByRole('heading', { name: 'Mitigation Pack - GenAI ChatBot Mitigation Pack' }),
    ).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Mitigation', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Comments', exact: true })).toBeVisible();

    await addPackRowsToWorkspace(page, 2);

    await navigateVia(page, 'Mitigations');
    await expect(page.getByRole('heading', { name: /^Mitigations \(2\)/ })).toBeVisible();
  });
});

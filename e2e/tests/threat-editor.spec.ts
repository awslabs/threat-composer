/** *******************************************************************************************************************
  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
  SPDX-License-Identifier: Apache-2.0
 ******************************************************************************************************************** */
import { test, expect } from '../fixtures/console-guard';
import {
  addThreat,
  expandSection,
  fillThreatStatement,
  gotoWorkspace,
  saveNewThreat,
  setThreatMetadata,
  waitForAppShell,
  workspacePath,
} from '../fixtures/app';
import { CARD, byTooltip, entityCard, grammarToken, threatSaveButton } from '../fixtures/selectors';
import { DEFAULT_WORKSPACE } from '../fixtures/routes';

/**
 * The guided threat-statement composer is the core of the product, so it gets
 * the most behavioural coverage: the grammar strip, the per-field editors, the
 * example helpers, metadata, links, and the list operations around it.
 */
test.describe('threat statement editor', () => {
  test.beforeEach(async ({ page }) => {
    await gotoWorkspace(page, DEFAULT_WORKSPACE, 'threats');
  });

  test('an empty threats list shows a zero counter and no cards', async ({ page }) => {
    // There is deliberately no empty-state copy in this component, so absence of
    // cards is the only correct assertion.
    await expect(page.getByRole('heading', { name: /^Threats \(0\)/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: /^Threat \d+/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Clear filters' })).toBeDisabled();
  });

  test('clicking a grammar token opens that field editor', async ({ page }) => {
    await page.getByRole('button', { name: 'Add new threat' }).click();

    // No field editor is mounted until a token is chosen — the app expects the
    // user to start from whichever part of the sentence they like.
    await expect(page.getByPlaceholder('Enter threat source')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: "Let's write a threat statement!" })).toBeVisible();

    await grammarToken(page, 'threat source').click();
    await expect(page.getByPlaceholder('Enter threat source')).toBeVisible();

    await grammarToken(page, 'threat action').click();
    await expect(page.getByPlaceholder('Enter threat action')).toBeVisible();
    // Only one editor is mounted at a time.
    await expect(page.getByPlaceholder('Enter threat source')).toHaveCount(0);
  });

  test('a filled field becomes a token in the statement and enables saving', async ({ page }) => {
    await page.getByRole('button', { name: 'Add new threat' }).click();
    const save = threatSaveButton(page, 'new');
    await expect(save).toBeDisabled();

    await fillThreatStatement(page, { threatSource: 'malicious insider' });

    await expect(page.getByRole('button', { name: 'malicious insider', exact: true })).toBeVisible();
    await expect(save).toBeEnabled();
  });

  test('"Give me a random example" fills the statement and "Start over" clears it', async ({
    page,
  }) => {
    await page.getByRole('button', { name: 'Add new threat' }).click();
    const save = threatSaveButton(page, 'new');

    await page.getByRole('button', { name: 'Give me a random example' }).click();
    await expect(save, 'a random example is a complete statement').toBeEnabled();

    await page.getByRole('button', { name: 'Start over' }).click();
    await expect(save, 'Start over should empty the statement again').toBeDisabled();
    // The unfilled placeholder tokens should be back.
    await expect(page.getByRole('button', { name: 'threat source', exact: true })).toBeVisible();
  });

  test('impacted goal and impacted assets accept free-text tokens', async ({ page }) => {
    await page.getByRole('button', { name: 'Add new threat' }).click();
    await fillThreatStatement(page, {
      threatSource: 'external actor',
      impactedGoal: 'availability',
      impactedAssets: 'customer ledger',
    });

    await expect(page.getByRole('button', { name: 'availability', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'customer ledger', exact: true })).toBeVisible();

    // Tokens are dismissible.
    await expect(page.getByRole('button', { name: 'Remove customer ledger' })).toBeVisible();
  });

  test('priority set in the editor shows on the saved card', async ({ page }) => {
    await page.getByRole('button', { name: 'Add new threat' }).click();
    await fillThreatStatement(page, {
      threatSource: 'external actor',
      threatAction: 'exhaust the connection pool',
    });
    await setThreatMetadata(page, { priority: 'Low' });
    await saveNewThreat(page);

    await expect(page.getByRole('heading', { name: /^Threat 1\b.*Low/s })).toBeVisible();
  });

  test('STRIDE categories can be applied from the editor', async ({ page }) => {
    await page.getByRole('button', { name: 'Add new threat' }).click();
    await fillThreatStatement(page, { threatSource: 'external actor' });

    await expandSection(page, /^Metadata$/);
    const stride = page.getByPlaceholder('Choose STRIDE');
    // Fall back to the FormField label if the placeholder differs.
    const control = (await stride.count()) ? stride : page.getByLabel('STRIDE').first();
    await control.click();
    await page.getByRole('option', { name: 'Tampering', exact: true }).click();
    await page.keyboard.press('Escape');

    await saveNewThreat(page);
    await expect(page.getByRole('heading', { name: /^Threat 1\b/ })).toBeVisible();
  });

  test('a saved threat can be reopened, edited and re-saved', async ({ page }) => {
    await addThreat(page, {
      threatSource: 'external actor',
      threatAction: 'read the audit log',
    });

    await byTooltip(entityCard(page, 'Threat', 1), 'Edit').first().click();
    await expect(page).toHaveURL(/\/threats\/[0-9a-f-]{36}$/);
    await expect(page.getByRole('heading', { name: 'Threat 1', exact: true })).toBeVisible();

    // Change one field and save.
    await grammarToken(page, 'read the audit log').click();
    await page.getByPlaceholder('Enter threat action').fill('delete the audit log');
    await threatSaveButton(page, 'existing').click();

    await expect(page).toHaveURL(/\/threats$/);
    // The card must show the new wording and not the old.
    await expect(page.getByText(/delete the audit log/).first()).toBeVisible();
    await expect(page.getByText(/read the audit log/)).toHaveCount(0);
    // Still exactly one threat: an edit must not create a second.
    await expect(page.getByRole('heading', { name: /^Threats \(1\)/ })).toBeVisible();
  });

  test('duplicating a threat creates a second, independent threat', async ({ page }) => {
    await addThreat(page, {
      threatSource: 'external actor',
      threatAction: 'replay a request',
    });

    await entityCard(page, 'Threat', 1).getByRole('button', { name: 'More actions' }).click();
    await page.getByRole('menuitem', { name: 'Duplicate' }).click();

    // Duplicating opens a NEW threat pre-seeded from the original.
    await expect(page).toHaveURL(/\/threats\/new\?idToCopy=[0-9a-f-]{36}$/);
    await expect(page.getByRole('button', { name: 'replay a request', exact: true })).toBeVisible();

    await saveNewThreat(page);
    await expect(page.getByRole('heading', { name: /^Threats \(2\)/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: /^Threat 2\b/ })).toBeVisible();
  });

  test('a threat can be removed via its confirmation dialog', async ({ page }) => {
    await addThreat(page, { threatSource: 'external actor', threatAction: 'do something bad' });
    await expect(page.getByRole('heading', { name: /^Threats \(1\)/ })).toBeVisible();

    await byTooltip(entityCard(page, 'Threat', 1), 'Remove From Workspace').first().click();
    await expect(page.getByRole('heading', { name: 'Remove Threat 1?' }).first()).toBeVisible();

    // Cancelling must not delete.
    await page.getByRole('button', { name: 'close', exact: true }).click();
    await expect(page.getByRole('heading', { name: /^Threats \(1\)/ })).toBeVisible();

    await byTooltip(entityCard(page, 'Threat', 1), 'Remove From Workspace').first().click();
    await page.getByRole('button', { name: 'delete', exact: true }).click();
    await expect(page.getByRole('heading', { name: /^Threats \(0\)/ })).toBeVisible();
  });

  test('the text filter narrows the list and Clear filters restores it', async ({ page }) => {
    await addThreat(page, { threatSource: 'external actor', threatAction: 'poison the cache' });
    await addThreat(page, { threatSource: 'internal actor', threatAction: 'exfiltrate backups' });
    await expect(page.getByRole('heading', { name: /^Threats \(2\)/ })).toBeVisible();

    await page.getByPlaceholder('Find threat statements').fill('poison');
    await expect(page.getByRole('heading', { name: /^Threats \(1\)/ })).toBeVisible();
    // On the list the statement is plain text in the card, not the clickable
    // tokens the editor renders.
    await expect(page.getByText(/poison the cache/).first()).toBeVisible();
    await expect(page.getByText(/exfiltrate backups/)).toHaveCount(0);

    const clear = page.getByRole('button', { name: 'Clear filters' });
    await expect(clear).toBeEnabled();
    await clear.click();
    await expect(page.getByRole('heading', { name: /^Threats \(2\)/ })).toBeVisible();
  });

  test('the custom template editor is reachable and can be reset', async ({ page }) => {
    await page.getByRole('button', { name: 'Add new threat' }).click();

    // The FieldSelector has its own "More actions" menu, separate from the
    // workspace-level one in the top strip.
    await page
      .locator(CARD)
      .filter({ has: page.getByRole('heading', { name: "Let's write a threat statement!" }) })
      .getByRole('button', { name: 'More actions' })
      .click();
    await page.getByRole('menuitem', { name: 'Custom Template' }).click();

    await expect(page.getByRole('heading', { name: 'Custom Template' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reset to default' })).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('heading', { name: 'Custom Template' })).toHaveCount(0);
  });

  test('"Threat list" abandons the editor without saving', async ({ page }) => {
    await page.getByRole('button', { name: 'Add new threat' }).click();
    await fillThreatStatement(page, { threatSource: 'discarded actor' });

    await page.getByRole('button', { name: 'Threat list' }).click();
    await expect(page).toHaveURL(/\/threats$/);
    await expect(page.getByRole('heading', { name: /^Threats \(0\)/ })).toBeVisible();
  });

  test('an unknown threat id does not crash the editor', async ({ page }) => {
    await page.goto(workspacePath('threats/00000000-0000-0000-0000-000000000000'));
    await waitForAppShell(page);
    await expect(page.locator('#root')).not.toBeEmpty();
  });
});

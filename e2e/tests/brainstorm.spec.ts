/** *******************************************************************************************************************
  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
  SPDX-License-Identifier: Apache-2.0
 ******************************************************************************************************************** */
import { test, expect } from '../fixtures/console-guard';
import {
  addBrainstormItem,
  brainstormItemAction,
  gotoWorkspace,
  navigateVia,
} from '../fixtures/app';
import { DEFAULT_WORKSPACE } from '../fixtures/routes';

/**
 * The brainstorm board is the capture-first entry point: ideas are jotted down
 * quickly and later promoted into real assumptions and mitigations, or turned
 * into threats. Two behaviours here are easy to break and invisible to a build:
 * the input commits on Enter with no button at all, and every item action is
 * revealed only on hover.
 */
test.describe('brainstorm board', () => {
  test.beforeEach(async ({ page }) => {
    await gotoWorkspace(page, DEFAULT_WORKSPACE, 'brainstorm');
    await expect(page.getByRole('heading', { name: 'Brainstorm', level: 1 })).toBeVisible();
  });

  test('all seven capture columns are present', async ({ page }) => {
    for (const placeholder of [
      'Add assumption...',
      'Add threat source...',
      'Add prerequisite...',
      'Add threat action...',
      'Add threat impact...',
      'Add asset...',
      'Add mitigation...',
    ]) {
      await expect(page.getByPlaceholder(placeholder)).toBeVisible();
    }
  });

  test('an idea is captured with Enter and can be edited and deleted', async ({ page }) => {
    // There is no add button anywhere on this board — Enter is the only commit.
    await addBrainstormItem(page, 'Add threat source...', 'A careless third-party integrator');

    await brainstormItemAction(page, 'A careless third-party integrator', 'Edit item');
    const editor = page.getByPlaceholder('Edit content...');
    await expect(editor).toBeVisible();
    await editor.fill('A careless third-party integrator (revised)');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText('A careless third-party integrator (revised)')).toBeVisible();

    await brainstormItemAction(page, 'A careless third-party integrator (revised)', 'Delete item');
    await expect(page.getByText('A careless third-party integrator (revised)')).toHaveCount(0);
  });

  test('item actions are hidden until the card is hovered', async ({ page }) => {
    await addBrainstormItem(page, 'Add assumption...', 'Hover reveals my actions');

    // Not merely invisible — not rendered at all.
    await expect(page.getByRole('button', { name: 'Promote item' })).toHaveCount(0);

    await page.getByText('Hover reveals my actions').first().hover();
    await expect(page.getByRole('button', { name: 'Promote item' }).first()).toBeVisible();
  });

  test('a brainstormed assumption can be promoted into a real assumption', async ({ page }) => {
    const idea = 'Third-party callbacks are authenticated';
    await addBrainstormItem(page, 'Add assumption...', idea);
    await brainstormItemAction(page, idea, 'Promote item');

    await page.getByText(idea).first().hover();
    const promoted = page.getByRole('button', { name: 'Item promoted' }).first();
    await expect(promoted).toBeVisible();
    await expect(promoted, 'promoting twice must not be possible').toBeDisabled();

    await navigateVia(page, 'Assumptions');
    await expect(page.getByRole('heading', { name: /^Assumptions \(1\)/ })).toBeVisible();
    await expect(page.getByText(idea)).toBeVisible();
  });

  test('a brainstormed mitigation can be promoted into a real mitigation', async ({ page }) => {
    const idea = 'Verify webhook signatures';
    await addBrainstormItem(page, 'Add mitigation...', idea);
    await brainstormItemAction(page, idea, 'Promote item');

    await navigateVia(page, 'Mitigations');
    await expect(page.getByRole('heading', { name: /^Mitigations \(1\)/ })).toBeVisible();
    await expect(page.getByText(idea)).toBeVisible();
  });

  test('a threat-source idea can be turned straight into a threat', async ({ page }) => {
    const idea = 'A compromised CI runner';
    await addBrainstormItem(page, 'Add threat source...', idea);

    // Threat-input columns offer a create-threat action instead of promotion.
    await brainstormItemAction(page, idea, 'Create threat with Threat Source');

    // It should open the threat editor pre-seeded with the idea as the source.
    // The text appears twice — as the statement token and in the field editor's
    // own input — so both are checked rather than asserting a unique match.
    await expect(page).toHaveURL(/\/threats\//);
    await expect(page.getByRole('heading', { name: "Let's write a threat statement!" })).toBeVisible();
    await expect(page.getByRole('button', { name: idea, exact: true }).first()).toBeVisible();
    await expect(page.getByPlaceholder('Enter threat source')).toHaveValue(idea);
  });

  test('column visibility toggles hide and restore columns', async ({ page }) => {
    await expect(page.getByPlaceholder('Add assumption...')).toBeVisible();

    const assumptionsToggle = page.getByRole('checkbox', { name: 'Assumptions' });
    await assumptionsToggle.click();
    await expect(page.getByPlaceholder('Add assumption...')).toHaveCount(0);

    await assumptionsToggle.click();
    await expect(page.getByPlaceholder('Add assumption...')).toBeVisible();

    // The master toggle controls all five threat-input columns at once.
    const threatInputs = page.getByRole('checkbox', { name: 'Threat Inputs' });
    await threatInputs.click();
    await expect(page.getByPlaceholder('Add threat source...')).toHaveCount(0);
    await expect(page.getByPlaceholder('Add asset...')).toHaveCount(0);
    // Assumptions and mitigations are unaffected.
    await expect(page.getByPlaceholder('Add assumption...')).toBeVisible();
  });

  test('the diagram modals open even with no diagram saved', async ({ page }) => {
    await page.getByRole('button', { name: 'Architecture Diagram' }).click();
    await expect(page.getByRole('heading', { name: 'Architecture Diagram' }).first()).toBeVisible();
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: 'Data Flow Diagram' }).click();
    await expect(page.getByRole('heading', { name: 'Data Flow Diagram' }).first()).toBeVisible();
  });

  test('captured ideas survive a reload', async ({ page }) => {
    await addBrainstormItem(page, 'Add asset...', 'The customer ledger');
    await page.reload();
    await expect(page.getByText('The customer ledger')).toBeVisible();
  });
});

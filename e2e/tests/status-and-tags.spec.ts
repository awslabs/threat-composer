/** *******************************************************************************************************************
  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
  SPDX-License-Identifier: Apache-2.0
 ******************************************************************************************************************** */
import { test, expect } from '../fixtures/console-guard';
import {
  addSimpleEntity,
  addTag,
  addThreat,
  expandSection,
  gotoWorkspace,
  navigateVia,
  removeTag,
  saveNewThreat,
  openStatusEditor,
  setStatusFromBadge,
  waitForAppShell,
} from '../fixtures/app';
import { entityCard } from '../fixtures/selectors';
import { DEFAULT_WORKSPACE } from '../fixtures/routes';

/**
 * Status and tags — both write paths, and both previously uncovered.
 *
 * Status matters disproportionately: on a threat it is a TOP-LEVEL field
 * (`saveStatement({ ...statement, status })`), not metadata, so a regression here
 * silently rewrites the entity on every save. Mitigations carry their own,
 * different four-value set. Assumptions have no status at all.
 */
test.describe('threat status', () => {
  test('can be changed from the card badge and survives a reload', async ({ page }) => {
    await gotoWorkspace(page, DEFAULT_WORKSPACE, 'threats');
    await addThreat(page, { threatSource: 'external actor', threatAction: 'poison the cache' });

    // New threats start as Identified.
    const card = entityCard(page, 'Threat', 1);
    await expect(card.getByRole('button', { name: 'Identified', exact: true })).toBeVisible();

    await setStatusFromBadge(page, 'Threat', 1, 'Identified', 'Resolved');

    // Status is persisted on the entity, so it must survive a reload.
    await page.reload();
    await waitForAppShell(page);
    await expect(
      entityCard(page, 'Threat', 1).getByRole('button', { name: 'Resolved', exact: true }),
    ).toBeVisible();
  });

  test('offers all three threat statuses', async ({ page }) => {
    await gotoWorkspace(page, DEFAULT_WORKSPACE, 'threats');
    await addThreat(page, { threatSource: 'external actor', threatAction: 'do something bad' });

    // The badge swaps itself for a Select; the helper handles the focus timing and
    // picks the visible Select (the card also holds hidden ones in its collapsed
    // Metadata section).
    await openStatusEditor(page, 'Threat', 1, 'Identified');

    for (const status of ['Identified', 'Resolved', 'Not Useful']) {
      await expect(
        page.getByRole('option', { name: new RegExp(`^${status}`) }),
        `"${status}" should be offered`,
      ).toBeVisible();
    }
    await page.keyboard.press('Escape');
  });

  test('can be set from the editor Metadata section', async ({ page }) => {
    await gotoWorkspace(page, DEFAULT_WORKSPACE, 'threats');
    await page.getByRole('button', { name: 'Add new threat' }).click();
    await page.getByRole('button', { name: 'threat source', exact: true }).click();
    await page.getByPlaceholder('Enter threat source').fill('external actor');

    await expandSection(page, /^Metadata$/);
    // Reached by its FormField label. The Select trigger's accessible name is not
    // simply the selected value here (unlike the card badge, which is a plain
    // button whose text is the status).
    await page.getByLabel('Status').click();
    await page.getByRole('option', { name: /^Not Useful/ }).click();

    await saveNewThreat(page);
    await expect(
      entityCard(page, 'Threat', 1).getByRole('button', { name: 'Not Useful', exact: true }),
    ).toBeVisible();
  });
});

test.describe('mitigation status', () => {
  test('offers its own four-value set and persists a change', async ({ page }) => {
    await gotoWorkspace(page, DEFAULT_WORKSPACE, 'mitigations');
    await addSimpleEntity(page, 'mitigation', 'Enable cache signing.');

    const card = entityCard(page, 'Mitigation', 1);
    await openStatusEditor(page, 'Mitigation', 1, 'Identified');

    // Mitigations have a different status set from threats — notably the two
    // in-between states, which threats do not have.
    for (const status of ['Identified', 'In-progress', 'Resolved', 'Will not action']) {
      await expect(
        page.getByRole('option', { name: new RegExp(`^${status}`) }),
        `"${status}" should be offered for a mitigation`,
      ).toBeVisible();
    }

    await page.getByRole('option', { name: /^In-progress/ }).click();
    await expect(card.getByRole('button', { name: 'In-progress', exact: true })).toBeVisible();

    await page.reload();
    await waitForAppShell(page);
    await expect(
      entityCard(page, 'Mitigation', 1).getByRole('button', { name: 'In-progress', exact: true }),
    ).toBeVisible();
  });
});

test.describe('tags', () => {
  test('can be added to and removed from a threat, and persist', async ({ page }) => {
    await gotoWorkspace(page, DEFAULT_WORKSPACE, 'threats');
    await addThreat(page, { threatSource: 'external actor', threatAction: 'poison the cache' });

    const card = entityCard(page, 'Threat', 1);
    await addTag(card, 'pci');
    await addTag(card, 'tier-1');

    await page.reload();
    await waitForAppShell(page);
    const reloaded = entityCard(page, 'Threat', 1);
    await expect(reloaded.getByRole('button', { name: 'Remove pci' })).toBeVisible();
    await expect(reloaded.getByRole('button', { name: 'Remove tier-1' })).toBeVisible();

    // Removal is a separate handler from addition, and its dependency array
    // differs from its sibling's — so removal is asserted to persist too, not just
    // to disappear from the DOM.
    await removeTag(reloaded, 'pci');
    await page.reload();
    await waitForAppShell(page);
    const afterRemoval = entityCard(page, 'Threat', 1);
    await expect(
      afterRemoval.getByRole('button', { name: 'Remove pci' }),
      'a removed tag must stay removed after a reload',
    ).toHaveCount(0);
    await expect(afterRemoval.getByRole('button', { name: 'Remove tier-1' })).toBeVisible();
  });

  for (const kind of ['assumption', 'mitigation'] as const) {
    const Kind = kind === 'assumption' ? 'Assumption' : 'Mitigation';

    test(`can be added to and removed from ${kind}s, and persist`, async ({ page }) => {
      await gotoWorkspace(page, DEFAULT_WORKSPACE, `${kind}s`);
      await addSimpleEntity(page, kind, `A tagged ${kind}.`);

      const card = entityCard(page, Kind, 1);
      await addTag(card, 'compliance');

      await page.reload();
      await waitForAppShell(page);
      await expect(
        entityCard(page, Kind, 1).getByRole('button', { name: 'Remove compliance' }),
      ).toBeVisible();

      await removeTag(entityCard(page, Kind, 1), 'compliance');
      await page.reload();
      await waitForAppShell(page);
      await expect(
        entityCard(page, Kind, 1).getByRole('button', { name: 'Remove compliance' }),
      ).toHaveCount(0);
    });
  }

  test('a tag becomes available in the tag filter', async ({ page }) => {
    await gotoWorkspace(page, DEFAULT_WORKSPACE, 'threats');
    await addThreat(page, { threatSource: 'external actor', threatAction: 'poison the cache' });
    await addThreat(page, { threatSource: 'internal actor', threatAction: 'exfiltrate backups' });

    // Tag only the first threat.
    await addTag(entityCard(page, 'Threat', 1), 'pci');

    // The filter's options are built from tags actually present in the workspace.
    await page.getByRole('button', { name: 'Filtered by tags' }).click();
    await expect(page.getByRole('option', { name: 'pci' })).toBeVisible();
    await page.getByRole('option', { name: 'pci' }).click();
    await page.keyboard.press('Escape');

    await expect(page.getByRole('heading', { name: /^Threats \(1\)/ })).toBeVisible();
    await expect(page.getByText(/poison the cache/).first()).toBeVisible();
    await expect(page.getByText(/exfiltrate backups/)).toHaveCount(0);
  });
});

test.describe('comments metadata', () => {
  // On assumptions and mitigations, Comments is the ENTIRE contents of the
  // Metadata section — so with it uncovered, that section had no coverage at all.
  for (const kind of ['assumption', 'mitigation'] as const) {
    const Kind = kind === 'assumption' ? 'Assumption' : 'Mitigation';

    test(`a comment can be added to ${kind}s and persists`, async ({ page }) => {
      await gotoWorkspace(page, DEFAULT_WORKSPACE, `${kind}s`);
      await addSimpleEntity(page, kind, `A ${kind} needing review.`);

      const card = entityCard(page, Kind, 1);
      // Comments is not mounted until Metadata is expanded.
      await expect(card.locator('[contenteditable="true"]')).toHaveCount(0);
      await card.getByRole('button', { name: /^Metadata$/ }).click();

      const comments = card.locator('[contenteditable="true"]').first();
      await expect(comments).toBeVisible();
      await comments.click();
      await page.keyboard.type('Needs review by appsec.');
      await expect(card).toContainText('Needs review by appsec.');

      await page.reload();
      await waitForAppShell(page);
      const reloaded = entityCard(page, Kind, 1);
      await reloaded.getByRole('button', { name: /^Metadata$/ }).click();
      await expect(reloaded).toContainText('Needs review by appsec.');
    });
  }

  test('a threat comment reaches the report', async ({ page }) => {
    await gotoWorkspace(page, DEFAULT_WORKSPACE, 'threats');
    await addThreat(page, { threatSource: 'external actor', threatAction: 'poison the cache' });

    const card = entityCard(page, 'Threat', 1);
    await card.getByRole('button', { name: /^Metadata$/ }).click();
    const comments = card.locator('[contenteditable="true"]').first();
    await expect(comments).toBeVisible();
    await comments.click();
    await page.keyboard.type('Accepted risk for launch.');

    // The report has a Comments column, so the note must flow through to it.
    await navigateVia(page, 'Threat model');
    await expect(page.getByRole('main')).toContainText('Accepted risk for launch.');
  });
});

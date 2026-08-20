/** *******************************************************************************************************************
  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
  SPDX-License-Identifier: Apache-2.0
 ******************************************************************************************************************** */
import { test, expect } from '../fixtures/console-guard';
import {
  addSimpleEntity,
  addThreat,
  chooseFromAutosuggest,
  editEntityCard,
  expandSection,
  gotoWorkspace,
  navigateVia,
  removeEntityCard,
} from '../fixtures/app';
import { entityCard } from '../fixtures/selectors';
import { DEFAULT_WORKSPACE } from '../fixtures/routes';

/**
 * Assumptions and mitigations share one implementation
 * (GenericEntityCreationCard + GenericCard), so they are covered together, with
 * the differences between them called out explicitly. The linking behaviour is
 * the interesting part: links are what turn a list of threats into a threat
 * model, and creating an entity from a link field is a distinct code path from
 * creating one directly.
 */
for (const kind of ['assumption', 'mitigation'] as const) {
  const Kind = kind === 'assumption' ? 'Assumption' : 'Mitigation';
  const route = kind === 'assumption' ? 'assumptions' : 'mitigations';
  const listHeading = kind === 'assumption' ? /^Assumptions \(\d+\)/ : /^Mitigations \(\d+\)/;

  test.describe(`${kind}s`, () => {
    test.beforeEach(async ({ page }) => {
      await gotoWorkspace(page, DEFAULT_WORKSPACE, route);
    });

    test(`an ${kind} can be created, edited and removed`, async ({ page }) => {
      await expect(page.getByRole('heading', { name: listHeading })).toContainText('(0)');

      await addSimpleEntity(page, kind, `First ${kind} content.`);
      await expect(page.getByRole('heading', { name: new RegExp(`^${Kind} 1\\b`) })).toBeVisible();
      await expect(page.getByRole('heading', { name: listHeading })).toContainText('(1)');

      await editEntityCard(page, Kind, 1, `Edited ${kind} content.`);
      // Scope to the card: a page-wide check would also see the (empty) creation
      // card and any transient editor state.
      const card = entityCard(page, Kind, 1);
      await expect(card).toContainText(`Edited ${kind} content.`);
      await expect(card).not.toContainText(`First ${kind} content.`);

      await removeEntityCard(page, Kind, 1);
      await expect(page.getByRole('heading', { name: listHeading })).toContainText('(0)');
    });

    test(`the ${kind} save button is disabled until there is content`, async ({ page }) => {
      await page.getByRole('button', { name: `Add new ${kind}` }).click();

      const creationCard = page
        .locator('div[class*="awsui_root_"][class*="awsui_variant-default"]')
        .filter({ has: page.getByRole('heading', { name: `Add new ${kind}` }) })
        .first();

      await expect(creationCard.getByRole('button', { name: 'Save', exact: true })).toBeDisabled();
      await creationCard.locator('textarea').first().fill('Some content');
      await expect(creationCard.getByRole('button', { name: 'Save', exact: true })).toBeEnabled();

      // Reset clears the draft rather than saving it.
      await creationCard.getByRole('button', { name: 'Reset' }).click();
      await expect(creationCard.getByRole('button', { name: 'Save', exact: true })).toBeDisabled();
      await expect(page.getByRole('heading', { name: listHeading })).toContainText('(0)');
    });

    test(`the ${kind} text filter narrows the list`, async ({ page }) => {
      await addSimpleEntity(page, kind, 'Alpha specific content');
      await addSimpleEntity(page, kind, 'Beta specific content');
      await expect(page.getByRole('heading', { name: listHeading })).toContainText('(2)');

      await page.getByPlaceholder(`Find ${kind}s`).fill('Alpha');
      await expect(page.getByRole('heading', { name: listHeading })).toContainText('(1)');
      await expect(page.getByText('Beta specific content')).toHaveCount(0);
    });
  });
}

test.describe('linking between threats, assumptions and mitigations', () => {
  test('an assumption can be linked to an existing threat', async ({ page }) => {
    await gotoWorkspace(page, DEFAULT_WORKSPACE, 'threats');
    await addThreat(page, {
      threatSource: 'external actor',
      threatAction: 'forge a signed token',
    });

    await navigateVia(page, 'Assumptions');
    await addSimpleEntity(page, 'assumption', 'Token signing keys rotate weekly.');

    const card = entityCard(page, 'Assumption', 1);
    await card.getByRole('button', { name: /^Linked threats \(0\)$/ }).click();

    const search = card.getByPlaceholder('Search threat');
    // Only existing threats can be linked from here — this field cannot create a
    // threat, so the offered option must be the real threat.
    await chooseFromAutosuggest(page, search, 'forge', /forge a signed token/);

    await expect(card.getByRole('button', { name: /^Linked threats \(1\)$/ })).toBeVisible();

    // The link must be visible from the threat's side too.
    await navigateVia(page, 'Threats');
    await expect(page.getByText(/^Linked assumptions \(1\)$/).first()).toBeVisible();
  });

  test('a mitigation created from an assumption link field appears in the mitigations list', async ({
    page,
  }) => {
    await gotoWorkspace(page, DEFAULT_WORKSPACE, 'assumptions');
    await addSimpleEntity(page, 'assumption', 'Backups are encrypted at rest.');

    const card = entityCard(page, 'Assumption', 1);
    await card.getByRole('button', { name: /^Linked mitigations \(0\)$/ }).click();

    const search = card.getByPlaceholder('Search mitigation');
    // Free text in this field creates a brand-new mitigation.
    await chooseFromAutosuggest(page, search, 'Enable KMS key rotation', /Add new mitigation/);

    await expect(card.getByRole('button', { name: /^Linked mitigations \(1\)$/ })).toBeVisible();

    await navigateVia(page, 'Mitigations');
    await expect(page.getByRole('heading', { name: /^Mitigations \(1\)/ })).toBeVisible();
    await expect(page.getByText('Enable KMS key rotation')).toBeVisible();
    await expect(page.getByText(/^Linked assumptions \(1\)$/).first()).toBeVisible();
  });

  test('a linked mitigation can be unlinked again', async ({ page }) => {
    await gotoWorkspace(page, DEFAULT_WORKSPACE, 'threats');
    await page.getByRole('button', { name: 'Add new threat' }).click();

    await expandSection(page, /^Linked mitigations \(0\)$/);
    const search = page.getByPlaceholder('Search mitigation');
    await chooseFromAutosuggest(page, search, 'Rate-limit the login endpoint', /Add new mitigation/);
    await expect(page.getByRole('button', { name: /^Linked mitigations \(1\)$/ })).toBeVisible();

    // Token dismiss labels are numbered by the entity's numericId.
    await page.getByRole('button', { name: /^Unlink mitigation \d+$/ }).click();
    await expect(page.getByRole('button', { name: /^Linked mitigations \(0\)$/ })).toBeVisible();
  });

  test('linked-entity filters separate threats with and without mitigations', async ({ page }) => {
    await gotoWorkspace(page, DEFAULT_WORKSPACE, 'threats');

    // One threat with a mitigation...
    await page.getByRole('button', { name: 'Add new threat' }).click();
    await page.getByRole('button', { name: 'threat source', exact: true }).click();
    await page.getByPlaceholder('Enter threat source').fill('mitigated actor');
    await expandSection(page, /^Linked mitigations \(0\)$/);
    const mitSearch = page.getByPlaceholder('Search mitigation');
    await chooseFromAutosuggest(page, mitSearch, 'A real mitigation', /Add new mitigation/);
    await page.getByRole('button', { name: /^(Add to list|Add to workspace .+)$/ }).click();
    await expect(page).toHaveURL(/\/threats$/);

    // ...and one without.
    await addThreat(page, { threatSource: 'unmitigated actor' });
    await expect(page.getByRole('heading', { name: /^Threats \(2\)/ })).toBeVisible();

    // LinkedEntityFilter segments are icon buttons. Their accessible name comes
    // from `iconAlt` ("Without linked mitigations"), which is NOT the tooltip
    // text shown on hover ("Show threats without linked mitigations").
    await page.getByRole('button', { name: 'Without linked mitigations' }).click();
    await expect(page.getByRole('heading', { name: /^Threats \(1\)/ })).toBeVisible();
    await expect(page.getByText(/unmitigated actor/).first()).toBeVisible();

    await page.getByRole('button', { name: 'With mitigations' }).click();
    await expect(page.getByRole('heading', { name: /^Threats \(1\)/ })).toBeVisible();
    await expect(page.getByText(/mitigated actor/).first()).toBeVisible();
  });
});

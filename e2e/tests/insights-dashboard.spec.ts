/** *******************************************************************************************************************
  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
  SPDX-License-Identifier: Apache-2.0
 ******************************************************************************************************************** */
import { test, expect } from '../fixtures/console-guard';
import {
  addSimpleEntity,
  addThreat,
  expandSection,
  gotoWorkspace,
  insightsDrilldown,
  navigateVia,
  saveNewThreat,
} from '../fixtures/app';
import { grammarToken } from '../fixtures/selectors';
import { DEFAULT_WORKSPACE } from '../fixtures/routes';

/**
 * The Insights dashboard was previously asserted only structurally — that the six
 * widget headings exist. Its actual job is twofold: report accurate counts, and
 * act as a jumping-off point into pre-filtered lists.
 *
 * That second part is a cross-page contract: each figure is a link that navigates
 * with router state, which the destination list reads as its `initialFilter` to
 * pre-seed the filter controls. It is the only mechanism in the app that applies a
 * filter without the user touching a filter, and it had no coverage at all.
 */
test.describe('insights dashboard', () => {
  test('an empty workspace shows the landing page instead', async ({ page }) => {
    await gotoWorkspace(page, DEFAULT_WORKSPACE, 'dashboard');
    await expect(page.getByRole('heading', { name: 'Threat Composer', level: 1 })).toBeVisible();
    await expect(page.getByRole('heading', { name: /^Insights dashboard/ })).toHaveCount(0);
  });

  test('reports accurate counts for a populated workspace', async ({ page }) => {
    await gotoWorkspace(page, DEFAULT_WORKSPACE, 'threats');

    // One High-priority threat...
    await page.getByRole('button', { name: 'Add new threat' }).click();
    await grammarToken(page, 'threat source').click();
    await page.getByPlaceholder('Enter threat source').fill('external actor');
    await grammarToken(page, 'threat action').click();
    await page.getByPlaceholder('Enter threat action').fill('poison the cache');
    await expandSection(page, /^Metadata$/);
    await page.getByRole('button', { name: 'Select Priority' }).click();
    await page.getByRole('option', { name: /^High/ }).click();
    await saveNewThreat(page);

    // ...and one with no priority at all.
    await addThreat(page, { threatSource: 'internal actor', threatAction: 'exfiltrate backups' });

    await navigateVia(page, 'Dashboard');
    await expect(page.getByRole('heading', { name: /^Insights dashboard/ })).toBeVisible();

    // The figures must reflect the data, not just render.
    await expect(insightsDrilldown(page, 'Total')).toHaveText('2');
    await expect(insightsDrilldown(page, 'High')).toHaveText('1');
    await expect(insightsDrilldown(page, 'Missing priority')).toHaveText('1');
    // Neither threat has a mitigation yet.
    await expect(insightsDrilldown(page, 'No mitigation')).toHaveText('2');
  });

  test('all six widgets render', async ({ page }) => {
    await gotoWorkspace(page, DEFAULT_WORKSPACE, 'threats');
    await addThreat(page, { threatSource: 'external actor', threatAction: 'poison the cache' });
    await navigateVia(page, 'Dashboard');

    for (const widget of [
      'Threat summary',
      'Threat prioritization',
      'Threat status',
      'Threat category distribution',
      'Threat grammar distribution',
      'Mitigation status',
    ]) {
      await expect(page.getByRole('heading', { name: widget, exact: true })).toBeVisible();
    }
  });

  test('"Missing priority" drills through to the threats list with a filter applied', async ({
    page,
  }) => {
    await gotoWorkspace(page, DEFAULT_WORKSPACE, 'threats');

    // One High threat, one with no priority.
    await page.getByRole('button', { name: 'Add new threat' }).click();
    await grammarToken(page, 'threat source').click();
    await page.getByPlaceholder('Enter threat source').fill('prioritised actor');
    await expandSection(page, /^Metadata$/);
    await page.getByRole('button', { name: 'Select Priority' }).click();
    await page.getByRole('option', { name: /^High/ }).click();
    await saveNewThreat(page);

    await addThreat(page, { threatSource: 'unranked actor' });
    await expect(page.getByRole('heading', { name: /^Threats \(2\)/ })).toBeVisible();

    await navigateVia(page, 'Dashboard');
    await insightsDrilldown(page, 'Missing priority').click();

    await expect(page).toHaveURL(/\/threats$/);
    // The destination arrives pre-filtered: only the threat without a priority.
    await expect(page.getByRole('heading', { name: /^Threats \(1\)/ })).toBeVisible();
    await expect(page.getByText(/unranked actor/).first()).toBeVisible();
    await expect(page.getByText(/prioritised actor/)).toHaveCount(0);
    // And the filter controls reflect it, so the user can see why.
    await expect(
      page.getByRole('button', { name: 'Clear filters' }),
      'arriving via a drill-down should leave a clearable filter applied',
    ).toBeEnabled();
  });

  test('"No mitigation" drills through to threats lacking a mitigation', async ({ page }) => {
    await gotoWorkspace(page, DEFAULT_WORKSPACE, 'threats');

    // One threat with a mitigation...
    await page.getByRole('button', { name: 'Add new threat' }).click();
    await grammarToken(page, 'threat source').click();
    await page.getByPlaceholder('Enter threat source').fill('mitigated actor');
    const { linkMitigationFromEditor } = await import('../fixtures/app');
    await linkMitigationFromEditor(page, 'Sign the cache entries.');
    await saveNewThreat(page);

    // ...and one without.
    await addThreat(page, { threatSource: 'unmitigated actor' });

    await navigateVia(page, 'Dashboard');
    await expect(insightsDrilldown(page, 'No mitigation')).toHaveText('1');
    await insightsDrilldown(page, 'No mitigation').click();

    await expect(page).toHaveURL(/\/threats$/);
    await expect(page.getByRole('heading', { name: /^Threats \(1\)/ })).toBeVisible();
    await expect(page.getByText(/unmitigated actor/).first()).toBeVisible();
  });

  test('"Total" drills through unfiltered', async ({ page }) => {
    await gotoWorkspace(page, DEFAULT_WORKSPACE, 'threats');
    await addThreat(page, { threatSource: 'external actor', threatAction: 'poison the cache' });
    await addThreat(page, { threatSource: 'internal actor', threatAction: 'exfiltrate backups' });

    await navigateVia(page, 'Dashboard');
    await insightsDrilldown(page, 'Total').click();

    await expect(page).toHaveURL(/\/threats$/);
    await expect(page.getByRole('heading', { name: /^Threats \(2\)/ })).toBeVisible();
  });

  test('mitigation progress drills through to the mitigations list', async ({ page }) => {
    await gotoWorkspace(page, DEFAULT_WORKSPACE, 'mitigations');
    await addSimpleEntity(page, 'mitigation', 'Enable cache signing.');

    await navigateVia(page, 'Dashboard');
    await expect(page.getByRole('heading', { name: /^Insights dashboard/ })).toBeVisible();

    const link = insightsDrilldown(page, 'Mitigation progress');
    await expect(link).toBeVisible();
    await link.click();

    await expect(page).toHaveURL(/\/mitigations$/);
    await expect(page.getByRole('heading', { name: /^Mitigations \(\d+\)/ })).toBeVisible();
  });
});

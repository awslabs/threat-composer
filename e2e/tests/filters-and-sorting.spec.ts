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
import {
  addTag,
  addThreat,
  applyFilter,
  clearFilters,
  expandSection,
  gotoWorkspace,
  saveNewThreat,
  setSortBy,
  setStatusFromBadge,
  threatCardOrder,
} from '../fixtures/app';
import { entityCard, grammarToken } from '../fixtures/selectors';
import { DEFAULT_WORKSPACE } from '../fixtures/routes';

/**
 * The threats list has ten filters and a two-part sort. Only the text filter and
 * the linked-entity filters were previously covered.
 *
 * Two implementation details make these worth testing rather than assuming:
 *  - Priority and STRIDE are read out of `metadata`, while status is a top-level
 *    field. Different code paths, so they regress independently.
 *  - Each filter has a "Not Set" sentinel that matches entities with no value,
 *    which is easy to break while refactoring the predicate.
 * Filters combine as AND across filters, OR within a filter.
 */

/** Two threats: one fully classified, one with nothing set. */
async function seedContrastingThreats(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'Add new threat' }).click();
  await grammarToken(page, 'threat source').click();
  await page.getByPlaceholder('Enter threat source').fill('external actor');
  await grammarToken(page, 'threat action').click();
  await page.getByPlaceholder('Enter threat action').fill('poison the cache');
  await page.getByRole('button', { name: 'Impacted goal', exact: true }).first().click();
  await page.getByPlaceholder('Select an impacted goal or enter new one').fill('integrity');
  await page.keyboard.press('Enter');
  await grammarToken(page, 'impacted assets').click();
  await page.getByPlaceholder('Select an existing asset or enter new asset').fill('cache tier');
  await page.keyboard.press('Enter');

  await expandSection(page, /^Metadata$/);
  await page.getByRole('button', { name: 'Select Priority' }).click();
  await page.getByRole('option', { name: /^High/ }).click();
  await page.getByLabel('STRIDE').first().click();
  await page.getByRole('option', { name: /^Tampering/ }).click();
  await page.keyboard.press('Escape');
  await saveNewThreat(page);

  // The second threat deliberately has no priority, no STRIDE, no assets.
  await addThreat(page, {
    threatSource: 'internal actor',
    threatAction: 'exfiltrate backups',
  });

  await expect(page.getByRole('heading', { name: /^Threats \(2\)/ })).toBeVisible();
}

const onlyClassified = async (page: import('@playwright/test').Page) => {
  await expect(page.getByRole('heading', { name: /^Threats \(1\)/ })).toBeVisible();
  await expect(page.getByText(/poison the cache/).first()).toBeVisible();
  await expect(page.getByText(/exfiltrate backups/)).toHaveCount(0);
};

const onlyUnclassified = async (page: import('@playwright/test').Page) => {
  await expect(page.getByRole('heading', { name: /^Threats \(1\)/ })).toBeVisible();
  await expect(page.getByText(/exfiltrate backups/).first()).toBeVisible();
  await expect(page.getByText(/poison the cache/)).toHaveCount(0);
};

test.describe('threat list filters', () => {
  test.beforeEach(async ({ page }) => {
    await gotoWorkspace(page, DEFAULT_WORKSPACE, 'threats');
    await seedContrastingThreats(page);
  });

  test('priority filter, including the "Priority Not Set" sentinel', async ({ page }) => {
    await applyFilter(page, 'Filtered by priority', /^High/);
    await onlyClassified(page);

    await clearFilters(page);
    await expect(page.getByRole('heading', { name: /^Threats \(2\)/ })).toBeVisible();

    // The sentinel must match the threat that has no Priority metadata at all.
    await applyFilter(page, 'Filtered by priority', /^Priority Not Set/);
    await onlyUnclassified(page);
  });

  test('STRIDE filter, including the "STRIDE Not Set" sentinel', async ({ page }) => {
    await applyFilter(page, 'Filtered by STRIDE', /^Tampering/);
    await onlyClassified(page);

    await clearFilters(page);
    await applyFilter(page, 'Filtered by STRIDE', /^STRIDE Not Set/);
    await onlyUnclassified(page);
  });

  test('status filter, including the "Not Set" sentinel', async ({ page }) => {
    // Both threats start Identified; move one to Resolved so the filter can split.
    await setStatusFromBadge(page, 'Threat', 2, 'Identified', 'Resolved');

    await applyFilter(page, 'Filtered by status', /^Resolved/);
    await expect(page.getByRole('heading', { name: /^Threats \(1\)/ })).toBeVisible();

    await clearFilters(page);
    await applyFilter(page, 'Filtered by status', /^Identified/);
    await expect(page.getByRole('heading', { name: /^Threats \(1\)/ })).toBeVisible();

    // Nothing is status-less, so the sentinel should match nothing.
    await clearFilters(page);
    await applyFilter(page, 'Filtered by status', /^Not Set/);
    await expect(page.getByRole('heading', { name: /^Threats \(0\)/ })).toBeVisible();
  });

  test('impacted assets and impacted goal filters', async ({ page }) => {
    // Options are built from values actually present in the workspace.
    await applyFilter(page, 'Filtered by Assets', /^cache tier/);
    await onlyClassified(page);

    await clearFilters(page);
    await applyFilter(page, 'Filtered by impacted goal', /^integrity/);
    await onlyClassified(page);
  });

  test('filters combine as AND across filters', async ({ page }) => {
    // High AND Tampering both describe the same threat, so it survives.
    await applyFilter(page, 'Filtered by priority', /^High/);
    await applyFilter(page, 'Filtered by STRIDE', /^Tampering/);
    await onlyClassified(page);

    // High AND "STRIDE Not Set" describe different threats, so nothing survives.
    await clearFilters(page);
    await applyFilter(page, 'Filtered by priority', /^High/);
    await applyFilter(page, 'Filtered by STRIDE', /^STRIDE Not Set/);
    await expect(
      page.getByRole('heading', { name: /^Threats \(0\)/ }),
      'contradictory filters should combine with AND, not OR',
    ).toBeVisible();
  });

  test('values combine as OR within a single filter', async ({ page }) => {
    // Selecting both a real value and the sentinel covers both threats.
    await applyFilter(page, 'Filtered by priority', /^High/);
    await applyFilter(page, 'Filtered by priority', /^Priority Not Set/);
    await expect(page.getByRole('heading', { name: /^Threats \(2\)/ })).toBeVisible();
  });

  test('Clear filters is disabled until a filter is active', async ({ page }) => {
    const clear = page.getByRole('button', { name: 'Clear filters' });
    await expect(clear).toBeDisabled();

    await page.getByPlaceholder('Find threat statements').fill('poison');
    await expect(clear).toBeEnabled();

    await clear.click();
    await expect(clear).toBeDisabled();
    await expect(page.getByPlaceholder('Find threat statements')).toHaveValue('');
    await expect(page.getByRole('heading', { name: /^Threats \(2\)/ })).toBeVisible();
  });

  test('the tag filter narrows by tag', async ({ page }) => {
    await addTag(entityCard(page, 'Threat', 1), 'pci');
    await applyFilter(page, 'Filtered by tags', /^pci$/);
    await expect(page.getByRole('heading', { name: /^Threats \(1\)/ })).toBeVisible();
  });
});

test.describe('threat list sorting', () => {
  test.beforeEach(async ({ page }) => {
    await gotoWorkspace(page, DEFAULT_WORKSPACE, 'threats');
    await seedContrastingThreats(page);
  });

  test('defaults to Id descending, and Ascending reverses it', async ({ page }) => {
    // Newest first by default.
    expect(await threatCardOrder(page)).toEqual(['Threat 2', 'Threat 1']);

    await setSortBy(page, { direction: 'Ascending' });
    expect(await threatCardOrder(page)).toEqual(['Threat 1', 'Threat 2']);

    await setSortBy(page, { direction: 'Descending' });
    expect(await threatCardOrder(page)).toEqual(['Threat 2', 'Threat 1']);
  });

  test('sorting by Priority ranks unset priority lowest', async ({ page }) => {
    // Threat 1 is High, Threat 2 has no priority. Priority sort maps High/Med/Low
    // to 3/2/1 and unset to 0, so descending puts High first...
    await setSortBy(page, { field: 'Priority' });
    expect(await threatCardOrder(page)).toEqual(['Threat 1', 'Threat 2']);

    // ...and ascending puts the unset one first.
    await setSortBy(page, { direction: 'Ascending' });
    expect(await threatCardOrder(page)).toEqual(['Threat 2', 'Threat 1']);
  });

  test('sorting survives filtering', async ({ page }) => {
    await setSortBy(page, { direction: 'Ascending' });
    await applyFilter(page, 'Filtered by priority', /^High/);
    expect(await threatCardOrder(page)).toEqual(['Threat 1']);

    await clearFilters(page);
    expect(
      await threatCardOrder(page),
      'the sort direction should not be reset by clearing filters',
    ).toEqual(['Threat 1', 'Threat 2']);
  });
});

test.describe('mitigation list filters', () => {
  test('status and tag filters narrow the mitigations list', async ({ page }) => {
    await gotoWorkspace(page, DEFAULT_WORKSPACE, 'mitigations');

    const { addSimpleEntity } = await import('../fixtures/app');
    await addSimpleEntity(page, 'mitigation', 'Enable cache signing.');
    await addSimpleEntity(page, 'mitigation', 'Rotate signing keys.');
    await expect(page.getByRole('heading', { name: /^Mitigations \(2\)/ })).toBeVisible();

    await addTag(entityCard(page, 'Mitigation', 1), 'quick-win');
    await applyFilter(page, 'Filtered by tags', /^quick-win$/);
    await expect(page.getByRole('heading', { name: /^Mitigations \(1\)/ })).toBeVisible();
    await clearFilters(page);

    // Mitigation statuses differ from threat statuses.
    await setStatusFromBadge(page, 'Mitigation', 2, 'Identified', 'Resolved');
    await applyFilter(page, 'Filtered by status', /^Resolved/);
    await expect(page.getByRole('heading', { name: /^Mitigations \(1\)/ })).toBeVisible();
  });
});

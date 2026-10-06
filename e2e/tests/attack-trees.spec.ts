/** *******************************************************************************************************************
  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
  SPDX-License-Identifier: Apache-2.0
 ******************************************************************************************************************** */
import type { Page } from '@playwright/test';
import {
  fillThreatStatement,
  gotoWorkspace,
  saveNewThreat,
  setThreatMetadata,
} from '../fixtures/app';
import { test, expect } from '../fixtures/console-guard';
import { DEFAULT_WORKSPACE } from '../fixtures/routes';

/**
 * Attack trees are a projection of the threat grammar: every tree is recomputed
 * from the existing threats on each render and nothing is persisted. Two things
 * here are easy to break and invisible to a build.
 *
 * First the scope. This view deliberately ships only the four derived
 * dimensions. Authored kill chains and custom trees were cut precisely because
 * they require persisting new state in `.tc.json`, which readers predating that
 * field reject outright — and the exchange schema is strict, so they reject the
 * whole file rather than the unknown key. A stray extra option in the selector
 * is the first visible symptom of that decision being undone, so the set is
 * asserted exhaustively rather than by sampling.
 *
 * Second the grammar mapping. Each dimension reads a different threat field and
 * prefixes the root differently ("Compromise:" for an asset, "Reduce:" for an
 * objective). Those are string derivations with no type protecting them, so a
 * renamed field silently roots the tree on a fallback label instead of failing.
 */

/** The complete set of dimensions this view supports. */
const ROOT_DIMENSIONS = [
  'Impacted asset',
  'Impacted security objective',
  'Threat source',
  'STRIDE category',
];

/** Each dimension, and the root label it must derive from the threat below. */
const DIMENSION_ROOTS: [dimension: string, root: string][] = [
  ['Impacted asset', 'Compromise: customer database'],
  ['Impacted security objective', 'Reduce: confidentiality'],
  ['Threat source', 'Attack by: internal actor'],
  // Capitalised differently from the editor option below: the tree root label
  // comes from `data/stride.ts` ("Information Disclosure") while the metadata
  // multiselect has its own list in STRIDESelector ("Information disclosure").
  ['STRIDE category', 'Attack category: Information Disclosure'],
];

const treeRootSelect = (page: Page) =>
  page.getByRole('button', { name: /Tree root/ });

/** Open the Tree root selector and choose a dimension by its visible label. */
async function selectTreeRoot(page: Page, label: string): Promise<void> {
  await treeRootSelect(page).click();
  await page.getByRole('option', { name: new RegExp(`^${label}`) }).click();
  await expect(treeRootSelect(page)).toContainText(label);
}

/**
 * Create one threat carrying every field the four dimensions read. The threat
 * source takes no leading article: the template prepends "An".
 */
async function addFullyDescribedThreat(page: Page): Promise<void> {
  await gotoWorkspace(page, DEFAULT_WORKSPACE, 'threats');
  await page.getByRole('button', { name: 'Add new threat' }).click();
  await fillThreatStatement(page, {
    threatSource: 'internal actor',
    prerequisites: 'with access to the admin console',
    threatAction: 'read customer records',
    threatImpact: 'disclosure of customer data',
    impactedGoal: 'confidentiality',
    impactedAssets: 'customer database',
  });
  await setThreatMetadata(page, {
    priority: 'High',
    // STRIDESelector's own option label, which is lowercase after the first word.
    stride: ['Information disclosure'],
  });
  await saveNewThreat(page);
}

test.describe('attack trees', () => {
  test('supports exactly the four derived dimensions and no authored ones', async ({
    page,
  }) => {
    await gotoWorkspace(page, DEFAULT_WORKSPACE, 'attackTrees');
    await expect(
      page.getByRole('heading', { name: /^Attack trees/ }).first(),
    ).toBeVisible();

    // An empty workspace must explain itself rather than render nothing.
    await expect(
      page.getByText('Add threats to your workspace to generate attack trees.'),
    ).toBeVisible();

    await treeRootSelect(page).click();
    const options = page.getByRole('option');
    await expect(options).toHaveCount(ROOT_DIMENSIONS.length);

    for (const [index, label] of ROOT_DIMENSIONS.entries()) {
      await expect(options.nth(index)).toContainText(label);
    }

    // The authored modes were removed along with their persistence layer. If
    // either name reappears here, the schema question has been reopened.
    for (const removed of ['Kill chain', 'Custom']) {
      await expect(
        page.getByRole('option', { name: new RegExp(`^${removed}`) }),
      ).toHaveCount(0);
    }
  });

  test('roots a tree on the matching grammar field for every dimension', async ({
    page,
  }) => {
    await addFullyDescribedThreat(page);
    await gotoWorkspace(page, DEFAULT_WORKSPACE, 'attackTrees');

    for (const [dimension, root] of DIMENSION_ROOTS) {
      // Impacted asset is the default, so it needs no selection.
      if (dimension !== 'Impacted asset') {
        await selectTreeRoot(page, dimension);
      }
      await expect(
        page.getByText(root).first(),
        `"${dimension}" should root its tree on the matching grammar field`,
      ).toBeVisible();
    }
  });

  test('counts what it decomposed and links a threat id back to the editor', async ({
    page,
  }) => {
    await addFullyDescribedThreat(page);
    await gotoWorkspace(page, DEFAULT_WORKSPACE, 'attackTrees');

    // The header counter proves the threat was actually decomposed into the
    // tree rather than the page merely rendering. Node-level shape is covered
    // by the buildAttackTrees unit tests; asserting it through the SVG here
    // would only pin label wrapping.
    await expect(page.getByText('(1 threats, 0 mitigations)')).toBeVisible();

    // The diagram is an accessible image naming the goal it decomposes.
    await expect(
      page.getByRole('img', {
        name: 'Attack tree for Compromise: customer database',
      }),
    ).toBeVisible();

    // Navigating from a tree node into the threat editor is a cross-page
    // contract no unit test covers: the id round-trips through the router.
    await page
      .getByRole('link', { name: 'Open T-0001 in the threats section' })
      .click();
    await expect(page).toHaveURL(/\/threats\/[0-9a-f-]{36}$/);
  });
});

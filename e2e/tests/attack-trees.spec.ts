/** *******************************************************************************************************************
  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
  SPDX-License-Identifier: Apache-2.0
 ******************************************************************************************************************** */
import type { Page } from '@playwright/test';
import {
  addTag,
  fillThreatStatement,
  gotoWorkspace,
  saveNewThreat,
  setThreatMetadata,
} from '../fixtures/app';
import { test, expect } from '../fixtures/console-guard';
import { DEFAULT_WORKSPACE } from '../fixtures/routes';
import { entityCard } from '../fixtures/selectors';

/**
 * Attack trees are a projection of the threat grammar: every tree is recomputed
 * from the existing threats on each render and nothing is persisted. Two things
 * here are easy to break and invisible to a build.
 *
 * First the scope. This view deliberately ships only derived dimensions: the
 * four grammar fields, plus tags, which are already stored on threats,
 * mitigations and assumptions. Authored kill chains and custom trees were cut precisely because
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
  'Tag',
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
  test('supports exactly the derived dimensions and no authored ones', async ({
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

  test('roots a tree at a nested tag and restores it from a shared URL', async ({
    page,
  }) => {
    await addFullyDescribedThreat(page);
    await gotoWorkspace(page, DEFAULT_WORKSPACE, 'threats');
    await addTag(entityCard(page, 'Threat', 1), 'exfiltrate-pii/via-api');

    await gotoWorkspace(page, DEFAULT_WORKSPACE, 'attackTrees');
    await selectTreeRoot(page, 'Tag');
    await expect(
      page.getByText('Choose one or more root tags to build trees.'),
    ).toBeVisible();

    // The parent prefix is offered even though no entity carries it alone.
    await page.getByRole('button', { name: /Root tags/ }).click();
    await page.getByRole('option', { name: /^exfiltrate-pii/ }).first().click();
    await page.keyboard.press('Escape');

    const tree = page.getByRole('img', {
      name: 'Attack tree for Tag: exfiltrate-pii',
    });
    await expect(tree).toBeVisible();
    // The nested segment becomes a sub-goal node beneath the root. Matched on
    // the rendered label; the node's <title> tooltip carries the same text.
    await expect(tree.locator('text', { hasText: /^via-api$/ })).toBeVisible();
    await expect(page).toHaveURL(/[?&]root=tag(&|$)/);
    await expect(page).toHaveURL(/[?&]rootTag=exfiltrate-pii(&|$)/);

    // A reload stands in for opening a shared link: the view comes back from
    // the URL alone, with nothing written to the workspace.
    await page.reload();
    await expect(
      page.getByRole('img', { name: 'Attack tree for Tag: exfiltrate-pii' }),
    ).toBeVisible();
  });
});

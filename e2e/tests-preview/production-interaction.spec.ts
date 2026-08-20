/** *******************************************************************************************************************
  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
  SPDX-License-Identifier: Apache-2.0
 ******************************************************************************************************************** */
import fs from 'node:fs';
import { test, expect } from '../fixtures/console-guard';
import {
  addSimpleEntity,
  addThreat,
  createWorkspace,
  downloadFromReport,
  fillApplicationInfo,
  navigateVia,
  uniqueWorkspaceName,
  waitForAppShell,
} from '../fixtures/app';

/**
 * A condensed version of the main journey, run against the PRODUCTION bundle.
 *
 * The dev suite proves the app behaves correctly when Vite serves modules
 * individually. That is not the same artifact users get: production goes through
 * Rollup, with real chunk splitting, minification, tree-shaking and the
 * `define: { global: 'globalThis' }` substitution baked in. Minification is
 * exactly where a value mistakenly erased by the `import type` codemod, or a
 * dependency that only works unbundled, would show up.
 *
 * So this covers the same critical paths end to end — workspace creation, the
 * grammar editor, persistence, the report and the docx export — but on the
 * bundle that ships. It stays deliberately short; the exhaustive per-feature
 * coverage lives in the dev suite.
 */
test.describe('production bundle behaviour', () => {
  test.setTimeout(3 * 60 * 1000);

  test('a user can build and export a threat model from the production build', async ({ page }) => {
    const workspace = uniqueWorkspaceName('Prod');

    await page.goto('/');
    await waitForAppShell(page);
    await createWorkspace(page, workspace);

    await navigateVia(page, 'Application info');
    await fillApplicationInfo(page, {
      name: 'Production Bundle Service',
      description: 'Created against the built artifact.',
    });

    await navigateVia(page, 'Threats');
    await addThreat(page, {
      threatSource: 'external actor',
      threatAction: 'bypass the authoriser',
      impactedGoal: 'confidentiality',
      impactedAssets: 'session tokens',
    });
    await expect(page.getByRole('heading', { name: /^Threats \(1\)/ })).toBeVisible();

    await navigateVia(page, 'Assumptions');
    await addSimpleEntity(page, 'assumption', 'Sessions expire after 15 minutes.');

    // The insights dashboard is a heavy, chart-bearing route — a good check that
    // its production chunk loads.
    await navigateVia(page, 'Dashboard');
    await expect(page.getByRole('heading', { name: /^Insights dashboard/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Threat summary', exact: true })).toBeVisible();

    await navigateVia(page, 'Threat model');
    const report = page.getByRole('main');
    await expect(report).toContainText('Production Bundle Service');
    await expect(report).toContainText('bypass the authoriser');
    await expect(report).toContainText('Sessions expire after 15 minutes.');

    // docx generation is the acid test for the `global` define, and minification
    // is where that substitution could plausibly go wrong.
    const docx = await downloadFromReport(page, 'Download as Word - Docx File');
    const docxPath = await docx.path();
    expect(fs.statSync(docxPath!).size).toBeGreaterThan(500);
    const header = Buffer.alloc(2);
    const fd = fs.openSync(docxPath!, 'r');
    fs.readSync(fd, header, 0, 2, 0);
    fs.closeSync(fd);
    expect(header.toString('latin1')).toBe('PK');

    // Everything must survive a reload, including through the service worker
    // that only registers in production.
    await page.reload();
    await waitForAppShell(page);
    await expect(page.locator('#WorkspacesSelect')).toContainText(`Workspace: ${workspace}`);
    await navigateVia(page, 'Threats');
    await expect(page.getByRole('heading', { name: /^Threats \(1\)/ })).toBeVisible();
  });

  test('every lazy route loads from its production chunk', async ({ page }) => {
    // Chunking moved from craco's forced splitChunks to Rollup's, so this is the
    // configuration that actually ships. A bad chunk blanks a route silently.
    await page.goto('/');
    await waitForAppShell(page);

    for (const [linkName, heading] of [
      ['Application info', /^Application information$/],
      ['Architecture', /^Architecture Diagram$/],
      ['Dataflow', /^Dataflow Diagram$/],
      ['Assumptions', /^Assumptions \(\d+\)/],
      ['Threats', /^Threats \(\d+\)/],
      ['Mitigations', /^Mitigations \(\d+\)/],
      ['Brainstorming', /^Brainstorm$/],
    ] as const) {
      await navigateVia(page, linkName);
      await expect(
        page.getByRole('heading', { name: heading }).first(),
        `production chunk for "${linkName}" did not render`,
      ).toBeVisible();
    }
  });
});

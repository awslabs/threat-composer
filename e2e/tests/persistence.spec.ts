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

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { test, expect } from '../fixtures/console-guard';
import {
  addSimpleEntity,
  addThreat,
  createWorkspace,
  fillApplicationInfo,
  gotoWorkspace,
  navigateVia,
  uniqueWorkspaceName,
  waitForAppShell,
  workspaceAction,
} from '../fixtures/app';
import { workspaceSelect } from '../fixtures/selectors';
import { DEFAULT_WORKSPACE } from '../fixtures/routes';

/**
 * All data is client-side, so localStorage IS the database. These tests cover
 * the properties a user depends on: work survives a reload, the selected
 * workspace is remembered, and a full export/import round trip preserves the
 * model. The round trip also exercises `sanitizeHtml` on imported data, which is
 * the path that would hit the deliberately-throwing postcss stub if the
 * `parseStyleAttributes: false` reasoning were wrong.
 */
test.describe('persistence', () => {
  test('work survives a page reload', async ({ page }) => {
    await gotoWorkspace(page, DEFAULT_WORKSPACE, 'application');
    await fillApplicationInfo(page, {
      name: 'Reload Survivor',
      description: 'Written before the reload.',
    });

    await navigateVia(page, 'Assumptions');
    await addSimpleEntity(page, 'assumption', 'Persisted assumption.');

    await page.reload();
    await waitForAppShell(page);

    await expect(page.getByRole('heading', { name: /^Assumptions \(1\)/ })).toBeVisible();
    await expect(page.getByText('Persisted assumption.')).toBeVisible();

    await navigateVia(page, 'Application info');
    await expect(page.getByRole('heading', { name: 'Reload Survivor' }).first()).toBeVisible();
    await expect(page.getByText('Written before the reload.')).toBeVisible();
  });

  test('the selected workspace is remembered across a reload', async ({ page }) => {
    const name = uniqueWorkspaceName('Sticky');
    await gotoWorkspace(page, DEFAULT_WORKSPACE, 'dashboard');
    await createWorkspace(page, name);

    // Navigate to the app root, so the redirect has to recover the workspace
    // from storage rather than from the URL.
    await page.goto('/');
    await waitForAppShell(page);

    await expect(workspaceSelect(page)).toContainText(`Workspace: ${name}`);
    await expect(page).toHaveURL(new RegExp(`/workspaces/${name}/`));
  });

  test('nothing leaks between browser contexts', async ({ page, browser }) => {
    await gotoWorkspace(page, DEFAULT_WORKSPACE, 'assumptions');
    await addSimpleEntity(page, 'assumption', 'Context-local assumption.');
    await expect(page.getByRole('heading', { name: /^Assumptions \(1\)/ })).toBeVisible();

    // A second context is a different browser profile, so it starts empty. This
    // is what makes the rest of the suite safe to run in parallel.
    const other = await browser.newContext();
    const otherPage = await other.newPage();
    await otherPage.goto('/workspaces/default/assumptions');
    await expect(otherPage.getByRole('heading', { name: /^Assumptions \(0\)/ })).toBeVisible();
    await other.close();
  });

  test('a full export/import round trip preserves the model', async ({ page }) => {
    const source = uniqueWorkspaceName('Export');
    const target = uniqueWorkspaceName('Import');

    // Build a small but complete model.
    await gotoWorkspace(page, DEFAULT_WORKSPACE, 'dashboard');
    await createWorkspace(page, source);

    await navigateVia(page, 'Application info');
    await fillApplicationInfo(page, {
      name: 'Round Trip Service',
      description: 'Exported and then imported again.',
    });

    await navigateVia(page, 'Threats');
    await addThreat(page, {
      threatSource: 'external actor',
      threatAction: 'tamper with the audit trail',
      impactedAssets: 'audit records',
    });

    await navigateVia(page, 'Assumptions');
    await addSimpleEntity(page, 'assumption', 'Audit records are append-only.');

    // Export the workspace as JSON.
    await page.getByRole('button', { name: 'More actions' }).first().click();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('menuitem', { name: 'Export data from current workspace' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe(`ThreatComposer_Workspace_${source}.tc.json`);

    const exportPath = path.join(os.tmpdir(), `tc-e2e-${Date.now()}.tc.json`);
    await download.saveAs(exportPath);

    const exported = JSON.parse(fs.readFileSync(exportPath, 'utf8'));
    expect(exported.applicationInfo.name).toBe('Round Trip Service');
    expect(exported.threats).toHaveLength(1);
    expect(exported.assumptions).toHaveLength(1);

    // Import it into a brand-new workspace.
    await createWorkspace(page, target);
    await navigateVia(page, 'Assumptions');
    await expect(page.getByRole('heading', { name: /^Assumptions \(0\)/ })).toBeVisible();

    await workspaceAction(page, 'Import into current workspace');
    await page.locator('input[type="file"]').setInputFiles(exportPath);

    const importButton = page.getByRole('button', { name: 'Import', exact: true });
    await expect(importButton, 'Import stays disabled until the JSON parses').toBeEnabled();
    await importButton.click();

    // A successful import lands on the report.
    await expect(page).toHaveURL(/\/threatModel$/);
    const report = page.getByRole('main');
    await expect(report).toContainText('Round Trip Service');
    await expect(report).toContainText('tamper with the audit trail');
    await expect(report).toContainText('Audit records are append-only.');

    // And the individual pages must agree.
    await navigateVia(page, 'Threats');
    await expect(page.getByRole('heading', { name: /^Threats \(1\)/ })).toBeVisible();
    await navigateVia(page, 'Assumptions');
    await expect(page.getByRole('heading', { name: /^Assumptions \(1\)/ })).toBeVisible();

    // The import must not have leaked into the source workspace.
    await expect(workspaceSelect(page)).toContainText(`Workspace: ${target}`);

    fs.rmSync(exportPath, { force: true });
  });

  test('importing malformed JSON reports an error instead of importing', async ({ page }) => {
    await gotoWorkspace(page, DEFAULT_WORKSPACE, 'dashboard');
    await workspaceAction(page, 'Import into current workspace');

    const badFile = path.join(os.tmpdir(), `tc-e2e-bad-${Date.now()}.json`);
    fs.writeFileSync(badFile, '{ this is not valid json ');

    await page.locator('input[type="file"]').setInputFiles(badFile);

    // Both actions must stay unavailable, and the parse failure must be shown to
    // the user rather than swallowed. The message is the raw JSON.parse error
    // (rendered as plain text in an Alert, with no role="alert").
    await expect(page.getByRole('button', { name: 'Import', exact: true })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Preview', exact: true })).toBeDisabled();
    await expect(page.getByText(/in JSON at position/i)).toBeVisible();

    fs.rmSync(badFile, { force: true });
  });
});

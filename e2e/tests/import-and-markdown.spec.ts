/** *******************************************************************************************************************
  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
  SPDX-License-Identifier: Apache-2.0
 ******************************************************************************************************************** */
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { test, expect } from '../fixtures/console-guard';
import { waitForAppShell, expectOnDashboard, workspacePath } from '../fixtures/app';

const FIXTURE = fileURLToPath(
  new URL('../fixtures/data/sample-threat-model.tc.json', import.meta.url),
);

/**
 * JSON import + markdown rendering. This is the highest-priority runtime path
 * after the console guard:
 *
 *  - Importing runs `parseImportedData`, which calls `sanitizeHtml` on the
 *    incoming data. `sanitizeHtml` uses `sanitize-html` configured with
 *    `parseStyleAttributes: false`; the reasoning that this means postcss's
 *    `parse` (aliased to a stub that THROWS) is never reached was only ever
 *    checked in the type-checker, never at runtime.
 *  - Viewing the threat model report runs `convertToMarkdown` (another
 *    `sanitizeHtml` call) and renders the markdown, exercising the markdown
 *    pipeline against loaded data.
 *
 * If the postcss stub is ever reached, `parse` throws and the console guard
 * fails the test.
 */
test.describe('threat model JSON import + markdown', () => {
  test('imports a .tc.json and renders it in the report without hitting the postcss stub', async ({
    page,
  }) => {
    await page.goto('/');
    await expectOnDashboard(page);
    await waitForAppShell(page);

    // Open the workspace "More actions" menu and choose import.
    await page.getByRole('button', { name: 'More actions' }).click();
    await page.getByText('Import into current workspace', { exact: true }).click();

    // The FileImport modal renders a file input that accepts application/json.
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(FIXTURE);

    // On a successful parse the primary "Import" button becomes enabled.
    const importButton = page.getByRole('button', { name: 'Import', exact: true });
    await expect(importButton).toBeEnabled({ timeout: 15_000 });
    await importButton.click();

    // Now view the report, which converts the model to markdown and renders it.
    await page.goto(workspacePath('threatModel'));
    await waitForAppShell(page);

    // The imported application name should surface in the rendered report.
    await expect(page.getByText('E2E Sample Workload').first()).toBeVisible({
      timeout: 15_000,
    });

    // A distinctive threat fragment from the fixture should render too.
    await expect(
      page.getByText(/inject a malicious response/i).first(),
    ).toBeVisible();
  });
});

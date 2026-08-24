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
import os from 'node:os';
import path from 'node:path';
import { test, expect, allowConsoleError } from '../fixtures/console-guard';
import {
  addThreat,
  fillApplicationInfo,
  gotoWorkspace,
  navigateVia,
  waitForAppShell,
  workspaceAction,
} from '../fixtures/app';
import { cs } from '../fixtures/cloudscape';
import { DEFAULT_WORKSPACE } from '../fixtures/routes';

/**
 * The Print button, the import Preview button, and the diagram image controls.
 *
 * Print does NOT call window.print() in the web app: it serialises the workspace
 * into localStorage under a fixed key and opens /preview/:dataKey in a new tab,
 * which reads it back and deletes the key on unmount. The suite previously only
 * visited /preview with a bogus key, which exercises the empty branch and proves
 * nothing about the real handoff.
 *
 * Note the preview page renders no `main` landmark, so assertions there are scoped
 * to `#root`.
 */
const TEMP_PREVIEW_KEY = 'ThreatStatementGenerator.TempPreviewData';

/** A 1x1 PNG, small enough that it can never trip the size limit. */
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==',
  'base64',
);

function writeTempFile(name: string, contents: Buffer | string): string {
  const filePath = path.join(os.tmpdir(), `tc-e2e-${Date.now()}-${name}`);
  fs.writeFileSync(filePath, contents);
  return filePath;
}

test.describe('print and preview', () => {
  test('Print hands the workspace to a preview tab via localStorage', async ({ page, context }) => {
    await gotoWorkspace(page, DEFAULT_WORKSPACE, 'application');
    await fillApplicationInfo(page, {
      name: 'Preview Target Service',
      description: 'Rendered in a preview tab.',
    });
    await navigateVia(page, 'Threats');
    await addThreat(page, {
      threatSource: 'external actor',
      threatAction: 'poison the cache',
      impactedAssets: 'cache tier',
    });

    await navigateVia(page, 'Threat model');

    // Nothing staged before the click.
    expect(await page.evaluate((k) => localStorage.getItem(k), TEMP_PREVIEW_KEY)).toBeNull();

    const popupPromise = context.waitForEvent('page');
    await page.getByRole('button', { name: 'Print', exact: true }).click();
    const preview = await popupPromise;

    await preview.waitForLoadState('domcontentloaded');
    await expect(preview).toHaveURL(new RegExp(`/preview/${TEMP_PREVIEW_KEY}$`));

    // The handoff really is localStorage, not a query string or an in-memory store.
    expect(
      await page.evaluate((k) => localStorage.getItem(k), TEMP_PREVIEW_KEY),
      'the workspace should be staged in localStorage for the preview tab',
    ).not.toBeNull();

    // And the new tab really renders the model it was handed.
    const previewRoot = preview.locator('#root');
    await expect(previewRoot).toContainText('Preview Target Service');
    await expect(previewRoot).toContainText('poison the cache');
    await expect(previewRoot).toContainText('T-0001');
    // It renders the report, so the report's own actions come along too.
    await expect(preview.getByRole('button', { name: 'Copy as Markdown' })).toBeVisible();

    await preview.close();
  });

  test('the import modal can preview a file without importing it', async ({ page, context }) => {
    await gotoWorkspace(page, DEFAULT_WORKSPACE, 'threats');
    await addThreat(page, { threatSource: 'external actor', threatAction: 'forge a token' });

    // Export, so there is a real file to preview.
    await page.getByRole('button', { name: 'More actions' }).first().click();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('menuitem', { name: 'Export data from current workspace' }).click();
    const exportFile = writeTempFile('export.tc.json', '');
    await (await downloadPromise).saveAs(exportFile);

    // Empty the workspace so "did Preview import anything?" is answerable.
    await workspaceAction(page, 'Remove data from current workspace');
    await page.getByPlaceholder('delete').fill('delete');
    await page.getByRole('button', { name: 'delete', exact: true }).click();
    await expect(page.getByRole('heading', { name: /^Threats \(0\)/ })).toBeVisible();

    await workspaceAction(page, 'Import into current workspace');
    const modal = page.locator(cs.modal);
    await expect(modal.getByRole('button', { name: 'Preview', exact: true })).toBeDisabled();

    await page.locator('input[type="file"]').setInputFiles(exportFile);
    const previewButton = page.getByRole('button', { name: 'Preview', exact: true });
    await expect(previewButton, 'Preview becomes available once the file parses').toBeEnabled();

    const popupPromise = context.waitForEvent('page');
    await previewButton.click();
    const preview = await popupPromise;
    await preview.waitForLoadState('domcontentloaded');
    await expect(preview.locator('#root')).toContainText('forge a token');
    await preview.close();

    // Preview must show the file WITHOUT committing it.
    await page.getByRole('button', { name: 'Cancel' }).click();
    await navigateVia(page, 'Threats');
    await expect(
      page.getByRole('heading', { name: /^Threats \(0\)/ }),
      'Preview should not import the file',
    ).toBeVisible();

    fs.rmSync(exportFile, { force: true });
  });
});

test.describe('diagram images', () => {
  // Architecture and Dataflow share one component (BaseDiagramInfo + ImageEdit),
  // so the image controls are covered once here.

  test('the image source defaults to none, and the controls are gated on it', async ({ page }) => {
    await gotoWorkspace(page, DEFAULT_WORKSPACE, 'architecture');

    await expect(page.getByRole('radio', { name: 'No Image' })).toBeChecked();
    // Neither input exists until its source is chosen.
    await expect(page.getByLabel('Image Url')).toHaveCount(0);
    await expect(page.locator('input[type="file"]')).toHaveCount(0);

    await page.getByRole('radio', { name: 'From url' }).check();
    await expect(page.getByLabel('Image Url')).toBeVisible();
    await expect(page.locator('input[type="file"]')).toHaveCount(0);

    await page.getByRole('radio', { name: 'From file upload' }).check();
    await expect(page.locator('input[type="file"]')).toHaveCount(1);
    await expect(page.getByLabel('Image Url')).toHaveCount(0);
  });

  test('an uploaded image is previewed and saved', async ({ page }) => {
    // KNOWN, BENIGN: browser-image-compression tries to run in a Web Worker
    // created from a blob URL, which the app's own CSP forbids (`script-src 'self'`
    // with no `worker-src`). The library falls back to the main thread, so the
    // upload still works — but the browser logs the refusal. The CSP is
    // byte-identical to origin/main, so this is pre-existing, not a migration
    // regression. Allow exactly that one message.
    //
    // The wording is browser-version dependent: older Chromium said "Refused to
    // create a worker from 'blob:…'", newer builds say "Creating a worker from
    // 'blob:…' violates the following Content Security Policy directive". Match
    // both, anchored on the worker-from-blob phrasing so it stays narrow.
    allowConsoleError(page, /(Refused to create|Creating) a worker from 'blob:/);

    await gotoWorkspace(page, DEFAULT_WORKSPACE, 'architecture');
    await page.getByRole('radio', { name: 'From file upload' }).check();

    const pngPath = writeTempFile('diagram.png', TINY_PNG);
    await page.locator('input[type="file"]').setInputFiles(pngPath);

    const previewImg = page.locator('img[alt="Preview Diagram"]');
    await expect(previewImg).toBeVisible();
    // The upload path stores a data URI, so the preview genuinely renders.
    expect(
      await previewImg.evaluate((img: HTMLImageElement) => img.naturalWidth),
      'the uploaded image should actually decode',
    ).toBeGreaterThan(0);
    await expect(page.getByText('Image size limit exceeded')).toHaveCount(0);

    await page.getByRole('button', { name: 'Confirm' }).click();

    // View mode renders it under the diagram heading, and it survives a reload.
    await expect(page.getByRole('button', { name: 'Edit', exact: true })).toBeVisible();
    await expect(page.locator('img[alt="Architecture Diagram"]')).toBeVisible();

    await page.reload();
    await waitForAppShell(page);
    const saved = page.locator('img[alt="Architecture Diagram"]');
    await expect(saved).toBeVisible();
    expect(await saved.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);

    fs.rmSync(pngPath, { force: true });
  });

  test('an SVG upload skips compression and still works', async ({ page }) => {
    // SVG is not in IMAGE_COMPRESSION_TYPES, so this path never touches the worker
    // and should be free of the CSP message above. No allowConsoleError here — if
    // this route starts logging errors, the guard should say so.
    await gotoWorkspace(page, DEFAULT_WORKSPACE, 'dataflow');
    await page.getByRole('radio', { name: 'From file upload' }).check();

    const svgPath = writeTempFile(
      'diagram.svg',
      '<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4"><rect width="4" height="4" fill="red"/></svg>',
    );
    await page.locator('input[type="file"]').setInputFiles(svgPath);

    await expect(page.locator('img[alt="Preview Diagram"]')).toBeVisible();
    await page.getByRole('button', { name: 'Confirm' }).click();
    await expect(page.locator('img[alt="Dataflow Diagram"]')).toBeVisible();

    fs.rmSync(svgPath, { force: true });
  });

  test('the image URL field rejects anything that is not a public http(s) URL', async ({ page }) => {
    await gotoWorkspace(page, DEFAULT_WORKSPACE, 'architecture');
    await page.getByRole('radio', { name: 'From url' }).check();
    const url = page.getByLabel('Image Url');

    // A data URI is rejected by ImageUrlSchema, and no preview is offered.
    await url.fill('data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');
    await expect(page.getByText(/Invalid string: must match pattern/)).toBeVisible();
    await expect(page.locator('img[alt="Preview Diagram"]')).toHaveCount(0);

    // So is a bare path.
    await url.fill('/favicon.svg');
    await expect(page.getByText(/Invalid string: must match pattern/)).toBeVisible();

    // A public URL is accepted and offered as a preview. (It cannot be asserted to
    // load — the test environment has no network — so the accepted-and-saved
    // behaviour is what matters here; actual decoding is covered by the upload
    // tests above.)
    await url.fill('https://example.com/architecture.png');
    await expect(page.getByText(/Invalid string: must match pattern/)).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Preview' })).toBeVisible();
    await expect(page.locator('img[alt="Preview Diagram"]')).toHaveAttribute(
      'src',
      'https://example.com/architecture.png',
    );
  });

  test('switching back to "No Image" clears the diagram but keeps the text', async ({ page }) => {
    // See the note above: the CSP worker message is worded differently across
    // Chromium versions.
    allowConsoleError(page, /(Refused to create|Creating) a worker from 'blob:/);

    await gotoWorkspace(page, DEFAULT_WORKSPACE, 'architecture');

    // Write an introduction AND upload an image.
    const editable = page.locator('[contenteditable="true"]').first();
    await editable.click();
    await page.keyboard.type('Fronted by API Gateway.');
    await page.getByRole('radio', { name: 'From file upload' }).check();
    const pngPath = writeTempFile('clear.png', TINY_PNG);
    await page.locator('input[type="file"]').setInputFiles(pngPath);
    await expect(page.locator('img[alt="Preview Diagram"]')).toBeVisible();
    await page.getByRole('button', { name: 'Confirm' }).click();
    await expect(page.locator('img[alt="Architecture Diagram"]')).toBeVisible();

    // Now remove just the image.
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    await page.getByRole('radio', { name: 'No Image' }).check();
    await page.getByRole('button', { name: 'Confirm' }).click();

    await expect(page.locator('img[alt="Architecture Diagram"]')).toHaveCount(0);
    await expect(
      page.getByText('Fronted by API Gateway.'),
      'removing the image must not discard the introduction',
    ).toBeVisible();

    fs.rmSync(pngPath, { force: true });
  });
});

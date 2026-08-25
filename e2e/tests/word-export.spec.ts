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
import { test, expect } from '../fixtures/console-guard';
import { waitForAppShell, workspacePath } from '../fixtures/app';

/**
 * Word / docx export — the acid test for the `define: { global: 'globalThis' }`
 * fix. `docx` (and the `buffer` polyfill it drags in) reference Node's `global`;
 * without the define, packing a document throws `global is not defined` at the
 * moment the user clicks export. A build check can't see this; only actually
 * generating the .docx in a browser can.
 *
 * `convertToDocx` is always passed to the report and `downloadFileName` is
 * always non-empty (getExportFileName), so this works on the default workspace
 * without any imported data.
 */
test.describe('Word (docx) export', () => {
  test('generates and downloads a non-empty .docx file', async ({ page }) => {
    await page.goto(workspacePath('threatModel'));
    await waitForAppShell(page);

    // Open the "Download" split/dropdown button on the report actions bar.
    await page.getByRole('button', { name: 'Download', exact: true }).click();

    // Arm the download listener before triggering it.
    const downloadPromise = page.waitForEvent('download', { timeout: 30_000 });
    await page
      .getByText('Download as Word - Docx File', { exact: true })
      .click();

    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/\.docx$/i);

    const savedPath = await download.path();
    expect(savedPath).toBeTruthy();

    const size = fs.statSync(savedPath!).size;
    // A valid docx (zip container) is comfortably over a few hundred bytes.
    expect(size).toBeGreaterThan(500);

    // Sanity check the zip/OOXML magic bytes ("PK").
    const fd = fs.openSync(savedPath!, 'r');
    const header = Buffer.alloc(2);
    fs.readSync(fd, header, 0, 2, 0);
    fs.closeSync(fd);
    expect(header.toString('latin1')).toBe('PK');
  });
});

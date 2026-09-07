/** *******************************************************************************************************************
  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
  SPDX-License-Identifier: Apache-2.0
 ******************************************************************************************************************** */
import mammoth from 'mammoth';
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
  test('generates a .docx that a word processor can open', async ({ page }) => {
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

    // Read it back with a real .docx reader rather than inspecting the zip
    // container by hand. mammoth walks the OOXML package the way a word
    // processor does, so a truncated download, a package missing the document
    // part, or a corrupt deflate stream all make this reject.
    const { value: text, messages } = await mammoth.extractRawText({
      path: savedPath!,
    });

    // mammoth reports anything it could not make sense of. Warnings are
    // tolerable (unsupported styles); errors mean the document is malformed.
    expect(messages.filter((m) => m.type === 'error')).toEqual([]);

    // A valid but empty .docx would still open, so check the report actually
    // made it into the document. These are the structural sections of a threat
    // model rather than prose, so the assertion survives copy changes.
    for (const section of [
      'Application Info',
      'Assumptions',
      'Threats',
      'Mitigations',
    ]) {
      expect(text, `the report should contain the "${section}" section`).toContain(
        section,
      );
    }
  });
});

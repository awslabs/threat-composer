/** *******************************************************************************************************************
  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
  SPDX-License-Identifier: Apache-2.0
 ******************************************************************************************************************** */
import fs from 'node:fs';
import { test, expect } from '../fixtures/console-guard';
import { waitForAppShell, workspacePath } from '../fixtures/app';
import { openDocx, REQUIRED_DOCX_ENTRIES } from '../fixtures/docx';

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

    // "PK" only proves this is *some* zip. Open it properly: a truncated
    // download, a package missing the document part, or a corrupt deflate
    // stream all satisfy the magic-byte check and none of them open in Word.
    // openDocx throws with the archive's actual contents listed if it cannot.
    const opened = openDocx(fs.readFileSync(savedPath!));

    expect(
      opened.entries,
      'the package should contain every part a word processor needs',
    ).toEqual(expect.arrayContaining([...REQUIRED_DOCX_ENTRIES]));

    // The body inflated and has a balanced <w:document> root, so the deflate
    // stream is intact and the XML is not truncated.
    expect(opened.documentXml).toContain('</w:document>');

    // And it is not an empty shell. Paragraph count rather than specific
    // wording, so the assertion survives legitimate copy changes.
    expect(
      opened.paragraphCount,
      'the exported document should contain real paragraphs',
    ).toBeGreaterThan(0);
  });
});

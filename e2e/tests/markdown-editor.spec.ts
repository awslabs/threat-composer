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
import { waitForAppShell, workspacePath } from '../fixtures/app';

/**
 * The markdown editor (@mdxeditor/editor) is a heavy ESM package whose Vite
 * pre-bundling differs from webpack's handling, and its style.css is a
 * side-effect import from the library's ESM output. The Application info page
 * renders it on load (ApplicationInfo -> MarkdownEditor), so simply visiting
 * the route and confirming the editor mounts exercises the pre-bundle.
 *
 * Typing into it additionally drives `useContentValidation`, which calls
 * `sanitizeHtml` on every change — another route into the postcss stub that
 * must not throw.
 */
test.describe('markdown editor (@mdxeditor/editor)', () => {
  test('mounts on the Application info page and accepts input', async ({ page }) => {
    await page.goto(workspacePath('application'));
    await waitForAppShell(page);

    // MDXEditor renders a container with an `mdxeditor`-prefixed class and a
    // contenteditable rich-text region.
    const editorContainer = page.locator('[class*="mdxeditor"]').first();
    await expect(editorContainer).toBeVisible({ timeout: 20_000 });

    const editable = page.locator('[contenteditable="true"]').first();
    await expect(editable).toBeVisible();

    // Light interaction: focus and type, which runs the content-validation /
    // sanitizeHtml path on change.
    await editable.click();
    await page.keyboard.type('e2e smoke input');
    await expect(editable).toContainText('e2e smoke input');
  });
});

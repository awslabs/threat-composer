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
import { waitForAppShell } from '../fixtures/app';

/**
 * Static assets and CSS. The library's PNG/GIF are rsync'd into lib/ and
 * imported as URLs from ESM; @cloudscape-design/global-styles/index.css and
 * @mdxeditor/editor/style.css are side-effect imports inside that ESM output.
 * If any of those failed to resolve, images would be broken and the app would
 * render unstyled.
 */
test.describe('static assets and CSS', () => {
  test('every rendered <img> actually loaded (naturalWidth > 0)', async ({ page }) => {
    await page.goto('/');
    await waitForAppShell(page);

    // Give lazily-rendered imagery a moment (logos, example thumbnails).
    await page.waitForLoadState('networkidle');

    const broken = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('img'));
      return imgs
        .filter((img) => {
          // Skip images that were never given a src.
          if (!img.currentSrc && !img.getAttribute('src')) {
            return false;
          }
          return !img.complete || img.naturalWidth === 0;
        })
        .map((img) => img.currentSrc || img.getAttribute('src') || '(no src)');
    });

    expect(broken, `Broken images: ${broken.join(', ')}`).toEqual([]);
  });

  test('stylesheets are applied (side-effect CSS imports resolved)', async ({ page }) => {
    await page.goto('/');
    await waitForAppShell(page);

    const styleSheetCount = await page.evaluate(() => document.styleSheets.length);
    expect(styleSheetCount).toBeGreaterThan(0);

    // Cloudscape components carry class names prefixed with `awsui`. Their
    // presence in the DOM confirms the component CSS is wired up.
    const hasAwsuiStyledNode = await page.evaluate(() =>
      Boolean(document.querySelector('[class*="awsui"]')),
    );
    expect(hasAwsuiStyledNode).toBe(true);
  });
});

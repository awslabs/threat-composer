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

/**
 * Production-only behaviour that `yarn dev` never exercises. Runs against
 * `vite preview` serving build/website (see playwright.preview.config.ts).
 *
 * The service worker only registers when import.meta.env.PROD. This covers SW
 * registration and the vite-plugin-pwa injectManifest output. Requires the
 * website to be built first (yarn workspace @aws/threat-composer-app run
 * compile:website).
 *
 * Imports the console guard rather than @playwright/test directly: the preview
 * specs previously had no console assertions at all, which left the bundle that
 * actually ships less covered than the dev server.
 */
test.describe('service worker (production build)', () => {
  test('service-worker.js is served as JavaScript', async ({ page }) => {
    const res = await page.request.get('/service-worker.js');
    expect(res.status()).toBe(200);
    const contentType = res.headers()['content-type'] ?? '';
    expect(contentType).toMatch(/javascript/i);
  });

  test('registers a service worker on load', async ({ page }) => {
    await page.goto('/');
    // Registration happens on the window `load` event and then asynchronously.
    await expect
      .poll(
        async () =>
          page.evaluate(async () => {
            if (!('serviceWorker' in navigator)) {
              return 0;
            }
            const regs = await navigator.serviceWorker.getRegistrations();
            return regs.length;
          }),
        { timeout: 30_000, message: 'expected a service worker to register' },
      )
      .toBeGreaterThan(0);
  });
});

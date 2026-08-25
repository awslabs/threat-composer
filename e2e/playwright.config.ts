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

import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

/**
 * Default config: runs the functional suite against the Vite **dev** server
 * (`pnpm dev` -> http://localhost:3000).
 *
 * Notes on the migration this suite guards (see report.html):
 *  - The dev server does NOT set VITE_APP_MODE and does NOT register the
 *    service worker. Production-only behaviour (SW registration, precache,
 *    app-shell route) is covered separately in playwright.preview.config.ts.
 *  - Specs live in ./tests and MUST stay outside packages/*\/src so the app's
 *    Vitest `include` glob never picks them up.
 */

const E2E_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(E2E_DIR, '..');

const BASE_URL = process.env.TC_BASE_URL ?? 'http://localhost:3000';

/**
 * Observability. By default we only pay the cost of artefacts on failure, and
 * because `retries` is 0 locally `on-first-retry` means traces are effectively
 * never recorded on a developer machine. Set TC_CAPTURE=1 (or run
 * `npm run test:trace`) to force a trace + video + screenshots for EVERY test so
 * you can replay exactly what the suite did:
 *
 *   npm run test:trace -- journey-threat-model
 *   npm run trace test-results/<dir>/trace.zip
 */
const CAPTURE_ALL = !!process.env.TC_CAPTURE;

// Allow pointing the suite at an already-running server (CI or a manually
// started `pnpm dev`) instead of having Playwright spawn one.
const REUSE_SERVER = !process.env.CI;

export default defineConfig({
  testDir: path.join(E2E_DIR, 'tests'),
  // Route-loading + console-error checks can be slow on a cold Vite dev server
  // (first request triggers on-the-fly dependency optimisation).
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
  ],
  use: {
    baseURL: BASE_URL,
    trace: CAPTURE_ALL ? 'on' : 'on-first-retry',
    screenshot: CAPTURE_ALL ? 'on' : 'only-on-failure',
    video: CAPTURE_ALL ? 'on' : 'retain-on-failure',
    // "Copy as Markdown" calls navigator.clipboard.writeText, which headless
    // Chromium rejects by default with an uncaught "Write permission denied".
    // Granting the permission both silences a false positive in the console guard
    // and lets the tests assert what was actually copied.
    permissions: ['clipboard-read', 'clipboard-write'],
    // Cloudscape honours prefers-reduced-motion, which removes the expand /
    // dropdown animations that otherwise make controls moving targets. The
    // console-guard fixture also injects a zero-duration stylesheet.
    contextOptions: { reducedMotion: 'reduce' },
  },
  projects: [
    {
      name: 'chromium-dev',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: process.env.TC_BASE_URL
    ? undefined
    : {
        // Run the app's dev server from the repo root via the workspace.
        command: 'pnpm --filter @aws/threat-composer-app run dev',
        cwd: REPO_ROOT,
        url: BASE_URL,
        reuseExistingServer: REUSE_SERVER,
        // Vite dev boot + first optimize pass can take a while on a clean install.
        timeout: 180_000,
        stdout: 'pipe',
        stderr: 'pipe',
      },
});

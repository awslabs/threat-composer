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
import { defineConfig } from '@playwright/test';

/**
 * Loads the built WXT extension as a real Chromium extension.
 *
 * No `projects` with a device preset and no `webServer`: the browser is launched
 * by the `context` fixture in fixtures/extension.ts via
 * `chromium.launchPersistentContext`, which is the only way Chromium will accept
 * `--load-extension`. Fixture pages are fulfilled by `page.route`, so nothing
 * needs to be served.
 *
 * Prerequisite: the extension must be built.
 *   pnpm e2e:build:extension
 *
 * `workers: 1` because every test boots its own persistent-context browser with
 * its own profile; running several at once is slow and the extension's storage is
 * per-profile anyway.
 */

const E2E_DIR = path.dirname(fileURLToPath(import.meta.url));

const CAPTURE_ALL = !!process.env.TC_CAPTURE;

// A path the fixture server answers with 200, so Playwright can detect readiness.
// Its root path is a deliberate 404, which webServer would treat as not-ready.
const FIXTURE_URL = 'http://localhost:4190/github/blob/ready.tc.json';

export default defineConfig({
  testDir: path.join(E2E_DIR, 'tests-extension'),
  // Extension boots plus a real threat-composer viewer load are slower than a
  // plain page, and the content script's own waitForCondition budget is 3s with
  // up to ~1.5s of retryWithBackoff on top.
  timeout: 90_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report-extension' }],
  ],
  use: {
    trace: CAPTURE_ALL ? 'on' : 'on-first-retry',
    screenshot: CAPTURE_ALL ? 'on' : 'only-on-failure',
    video: CAPTURE_ALL ? 'on' : 'off',
  },
  webServer: {
    command: 'node scripts/serve-extension-fixtures.mjs --port 4190',
    cwd: E2E_DIR,
    url: FIXTURE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});

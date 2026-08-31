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
 * Production-preview config: serves the already-built `build/website` bundle
 * via `vite preview` (http://localhost:3000) and runs ONLY the specs that need
 * production behaviour the dev server never exercises:
 *   - Service worker registration (only when import.meta.env.PROD).
 *   - Rollup chunking of the lazy routes as they actually ship.
 *   - The precache manifest / app-shell route.
 *
 * Prerequisite: the website must be built first, e.g.
 *   pnpm --filter @aws/threat-composer-app run compile:website
 * (or a full `pnpm build`). This config does not build for you beyond starting
 * `vite preview`, which fails fast if build/website is missing.
 */

const E2E_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(E2E_DIR, '..');

const BASE_URL = process.env.TC_PREVIEW_URL ?? 'http://localhost:3000';
const REUSE_SERVER = !process.env.CI;

// See the note in playwright.config.ts: TC_CAPTURE=1 forces artefacts for every
// test so a passing run can be replayed in the trace viewer.
const CAPTURE_ALL = !!process.env.TC_CAPTURE;

export default defineConfig({
  testDir: path.join(E2E_DIR, 'tests-preview'),
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report-preview' }],
  ],
  use: {
    baseURL: BASE_URL,
    trace: CAPTURE_ALL ? 'on' : 'on-first-retry',
    screenshot: CAPTURE_ALL ? 'on' : 'only-on-failure',
    video: CAPTURE_ALL ? 'on' : 'off',
    // Matches the dev config: "Copy as Markdown" uses navigator.clipboard, which
    // headless Chromium rejects by default with an uncaught page error.
    permissions: ['clipboard-read', 'clipboard-write'],
    // Cloudscape honours prefers-reduced-motion, which removes the expand /
    // dropdown animations that otherwise make controls moving targets. The
    // console-guard fixture also injects a zero-duration stylesheet.
    contextOptions: { reducedMotion: 'reduce' },
  },
  projects: [
    {
      name: 'chromium-preview',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: process.env.TC_PREVIEW_URL
    ? undefined
    : {
        command: 'pnpm --filter @aws/threat-composer-app run preview',
        cwd: REPO_ROOT,
        url: BASE_URL,
        reuseExistingServer: REUSE_SERVER,
        timeout: 120_000,
        stdout: 'pipe',
        stderr: 'pipe',
      },
});

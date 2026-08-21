/** *******************************************************************************************************************
  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
  SPDX-License-Identifier: Apache-2.0
 ******************************************************************************************************************** */
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

/**
 * Build-variant config: covers the two artifacts the migration produces that had
 * NO runtime coverage at all — `build/browser-extension` and `build/ide-extension`.
 *
 * Why they need their own config rather than joining the preview suite:
 *
 *  - Each variant is a separate build directory and must be served at its own
 *    server ROOT. Both are compiled with `base: '/'`, so their asset URLs are
 *    absolute and root-relative; mounting either under a sub-path 404s every
 *    asset. Hence two static servers on two ports, and a project per variant so
 *    each gets its own `baseURL`.
 *
 *  - Both use a MemoryRouter, so URL-driven navigation does not exist. Nothing in
 *    `tests/` or `tests-preview/` applies: those suites reach a screen with
 *    `page.goto(path)`, which here would 404 on the static server and, even if it
 *    served index.html, the memory router would still start at '/'. Every spec in
 *    `tests-variants/` must navigate by clicking.
 *
 * Prerequisite: both variants must be built, WITHOUT the GitHub Pages env vars:
 *   yarn e2e:build:variants
 * Building with VITE_ROUTE_BASE_PATH / VITE_GITHUB_PAGES set (which is what CI's
 * `yarn build` does) puts a basename on the memory router and turns on the
 * GitHub Pages notification banner, so the artifact under test would not be the
 * one the extensions actually ship.
 */

const E2E_DIR = path.dirname(fileURLToPath(import.meta.url));

const BROWSER_EXT_DIR = '../packages/threat-composer-app/build/browser-extension';
const IDE_EXT_DIR = '../packages/threat-composer-app/build/ide-extension';

// NOT 5060/5061 — those are SIP ports on Chromium's blocked list and every
// navigation fails with net::ERR_UNSAFE_PORT.
const BROWSER_EXT_PORT = 4180;
const IDE_EXT_PORT = 4181;

const BROWSER_EXT_URL = process.env.TC_BROWSER_EXT_URL ?? `http://localhost:${BROWSER_EXT_PORT}`;
const IDE_EXT_URL = process.env.TC_IDE_EXT_URL ?? `http://localhost:${IDE_EXT_PORT}`;

// See the note in playwright.config.ts: TC_CAPTURE=1 forces artefacts for every
// test so a passing run can be replayed in the trace viewer.
const CAPTURE_ALL = !!process.env.TC_CAPTURE;

const serveCommand = (dir: string, port: number) =>
  `node scripts/serve-static.mjs ${dir} --port ${port}`;

export default defineConfig({
  testDir: path.join(E2E_DIR, 'tests-variants'),
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report-variants' }],
  ],
  use: {
    trace: CAPTURE_ALL ? 'on' : 'on-first-retry',
    screenshot: CAPTURE_ALL ? 'on' : 'only-on-failure',
    video: CAPTURE_ALL ? 'on' : 'off',
    permissions: ['clipboard-read', 'clipboard-write'],
    contextOptions: { reducedMotion: 'reduce' },
  },
  projects: [
    {
      name: 'browser-extension',
      testMatch: /browser-extension\.spec\.ts$/,
      use: { ...devices['Desktop Chrome'], baseURL: BROWSER_EXT_URL },
    },
    {
      name: 'ide-extension',
      testMatch: /ide-extension\.spec\.ts$/,
      use: { ...devices['Desktop Chrome'], baseURL: IDE_EXT_URL },
    },
  ],
  webServer: [
    ...(process.env.TC_BROWSER_EXT_URL
      ? []
      : [
          {
            command: serveCommand(BROWSER_EXT_DIR, BROWSER_EXT_PORT),
            cwd: E2E_DIR,
            url: BROWSER_EXT_URL,
            reuseExistingServer: !process.env.CI,
            timeout: 60_000,
            stdout: 'pipe' as const,
            stderr: 'pipe' as const,
          },
        ]),
    ...(process.env.TC_IDE_EXT_URL
      ? []
      : [
          {
            command: serveCommand(IDE_EXT_DIR, IDE_EXT_PORT),
            cwd: E2E_DIR,
            url: IDE_EXT_URL,
            reuseExistingServer: !process.env.CI,
            timeout: 60_000,
            stdout: 'pipe' as const,
            stderr: 'pipe' as const,
          },
        ]),
  ],
});

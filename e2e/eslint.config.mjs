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

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';

/**
 * e2e is a standalone npm package, not a pnpm workspace, so `pnpm workspaces run
 * eslint` never reached it and its licence headers were previously enforced by
 * nothing. It is now linted from the repo root via `pnpm eslint:e2e`.
 *
 * Only the licence-header rule is enforced. The specs deliberately reach into page
 * internals and Cloudscape DOM, so the full typed rule set is a poor fit here.
 * @typescript-eslint is declared in .eslintrc.json without enabling any of its rules,
 * purely so that existing `eslint-disable` comments naming its rules still resolve.
 */
const compat = new FlatCompat({
  baseDirectory: path.dirname(fileURLToPath(import.meta.url)),
});

export default [
  // ESLint 9 flat config turns on `reportUnusedDisableDirectives` by default, and
  // `--fix` then DELETES any `eslint-disable` comment naming a rule that is declared
  // but not enabled -- silently stripping comments across the repo and leaving stray
  // whitespace. eslintrc did not do that, so it is switched off here to keep the
  // version bump behaviour-neutral. Enabling it is a deliberate follow-up.
  {
    linterOptions: { reportUnusedDisableDirectives: 'off' },
  },
  {
    ignores: [
      'node_modules/',
      'test-results/',
      'test-results-preview/',
      'playwright-report/',
      'playwright-report-preview/',
      'playwright-report-variants/',
      'playwright-report-extension/',
    ],
  },
  ...compat.extends('./.eslintrc.json').map((config) => ({
    ...config,
    files: ['**/*.ts', '**/*.mjs'],
  })),
];

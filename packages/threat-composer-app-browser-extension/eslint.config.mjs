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
 * ESLint 9 requires flat config. Rather than hand-rewrite the rule set and risk
 * silent behaviour drift, this uses `FlatCompat` from `@eslint/eslintrc` -- the ESLint
 * team's own bridge -- to translate ./.eslintrc.json, which stays the source of truth.
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
  // Flat config has no `ignorePatterns`: ignores are top-level and must come first.
  {
    ignores: ["**/*.js", "**/*.d.ts", "node_modules/", "**/*.generated.ts", "coverage"],
  },
  // Flat config also drops the `--ext` flag and only discovers .js/.mjs/.cjs by
  // default, so the translated configs must be scoped to the TypeScript sources
  // explicitly or nothing gets linted at all.
  ...compat.extends('./.eslintrc.json').map((config) => ({
    ...config,
    files: ["**/*.ts", "**/*.tsx"],
  })),
  // Lint this config file itself. The undeclared `@eslint/eslintrc` dependency that
  // shipped with the ESLint 9 migration survived a full `yarn eslint` run precisely
  // because flat config files sat outside the lint scope: the translated configs above
  // are scoped to **/*.ts{,x}, and the CLI only ever pointed at src/.
  //
  // The translated .eslintrc.json is deliberately not reused here. It is a typed config
  // keyed to a tsconfig this file is not part of, so applying it fails with a project
  // service error. Only the two rules that can catch this class of defect are enabled,
  // on the default parser: the licence header, and the extraneous-dependency check.
  //
  // `devDependencies` is widened to cover this file, which legitimately imports one.
  // An import declared in no manifest at all is still an error, and that is the case
  // that went unnoticed before.
  ...compat
    .config({
      extends: ['../../.eslintrc.header.json'],
      plugins: ['import'],
      rules: {
        'import/no-extraneous-dependencies': [
          'error',
          {
            devDependencies: ['**/eslint.config.mjs'],
            optionalDependencies: false,
            peerDependencies: true,
          },
        ],
      },
    })
    .map((config) => ({
      ...config,
      files: ['eslint.config.mjs'],
      languageOptions: { ecmaVersion: 'latest', sourceType: 'module' },
    })),
];

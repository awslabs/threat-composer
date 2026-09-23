/** *******************************************************************************************************************
  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
  SPDX-License-Identifier: Apache-2.0
 ******************************************************************************************************************** */
import header from '@tony.ganchev/eslint-plugin-header';
import typescript from '@typescript-eslint/eslint-plugin';
import parser from '@typescript-eslint/parser';
import importX from 'eslint-plugin-import-x';

export default [
  {
    ignores: ['node_modules/', 'playwright-report*/', 'test-results*/'],
  },
  {
    files: ['**/*.ts', '**/*.mjs'],
    plugins: {
      '@tony.ganchev/header': header,
      '@typescript-eslint': typescript,
      'import-x': importX,
    },
    // Preserve existing disable comments for rules not enabled here.
    linterOptions: { reportUnusedDisableDirectives: 'off' },
    settings: {
      'import-x/resolver': {
        typescript: { project: `${import.meta.dirname}/tsconfig.json` },
      },
    },
    rules: {
      '@tony.ganchev/header/header': [
        'error',
        'block',
        [
          '* *******************************************************************************************************************',
          '  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.',
          '  SPDX-License-Identifier: Apache-2.0',
          ' ******************************************************************************************************************** ',
        ],
      ],
      'import-x/no-duplicates': 'error',
      'import-x/no-unresolved': 'error',
      'import-x/no-extraneous-dependencies': [
        'error',
        {
          devDependencies: true,
          packageDir: [import.meta.dirname, `${import.meta.dirname}/..`],
        },
      ],
    },
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-require-imports': 'error',
    },
  },
];

/** *******************************************************************************************************************
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

import { validateData } from '@aws/threat-composer-core';
import { Argv, ArgumentsCamelCase } from 'yargs';
import { getInput } from '../utils/io';

export const validateCommand = {
  command: 'validate [file]',
  describe: 'Validate a JSON file or STDIN',
  builder: (yargs: Argv) => {
    return yargs.option('type', {
      describe: 'Type of validation to perform',
      type: 'string',
      choices: ['threatmodel'], // Only threatmodel available now
      default: 'threatmodel',
    })
      .positional('file', {
        describe: 'File to validate (if not provided, reads from STDIN)',
        type: 'string',
      });
  },
  handler: async (argv: ArgumentsCamelCase<{
    type?: string;
    file?: string;
  }>) => {
    try {
      // Check if type is supported
      if (argv.type !== 'threatmodel') {
        console.error(`Validation type '${argv.type}' is not yet implemented.`);
        console.error('Currently only threatmodel validation is available.');
        process.exit(1);
      }

      const input = await getInput(argv.file);
      let data;

      try {
        data = JSON.parse(input);
      } catch (e) {
        console.error('Error parsing JSON:', (e as Error).message);
        process.exit(1);
      }

      const result = validateData(data);
      if (result.success) {
        console.log('Validation successful');
        process.exit(0);
      } else {
        console.error('Validation failed:');
        console.error(JSON.stringify(result.error, null, 2));
        process.exit(1);
      }
    } catch (error) {
      console.error('Error:', (error as Error).message);
      process.exit(1);
    }
  },
};

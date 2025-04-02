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

import { convertToMarkdown } from '@aws/threat-composer-core';
import { Argv, ArgumentsCamelCase } from 'yargs';
import { getInput, writeOutput } from '../utils/io';

export const convertCommand = {
  command: 'convert [file]',
  describe: 'Convert a threat model JSON to another format',
  builder: (yargs: Argv) => {
    return yargs
      .option('format', {
        describe: 'Output format',
        type: 'string',
        choices: ['markdown'], // Only markdown available now
        default: 'markdown',
      })
      .option('output', {
        describe: 'Output file path (if not specified, outputs to STDOUT)',
        type: 'string',
      })
      .positional('file', {
        describe: 'File to convert (if not provided, reads from STDIN)',
        type: 'string',
      });
  },
  handler: async (argv: ArgumentsCamelCase<{
    format?: string;
    output?: string;
    file?: string;
  }>) => {
    try {
      // Check if format is supported
      if (argv.format !== 'markdown') {
        console.error(`Output format '${argv.format}' is not yet implemented.`);
        console.error('Currently only markdown conversion is available.');
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

      const markdown = await convertToMarkdown(data);
      await writeOutput(markdown, argv.output);
      process.exit(0);
    } catch (error) {
      console.error('Error:', (error as Error).message);
      process.exit(1);
    }
  },
};

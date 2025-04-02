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

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { convertCommand } from './commands/convert';
import setupFutureCommands from './commands/future';
import { validateCommand } from './commands/validate';

export function setupCli() {
  const cli = yargs(hideBin(process.argv))
    .scriptName('threat-composer-cli')
    .usage('$0 [command] [options]')
    .command(validateCommand)
    .command(convertCommand)
    .demandCommand(1, 'You need to specify a command')
    .strict()
    .help()
    .epilogue('Currently implemented: validate (threatmodel only), convert (markdown only)\nOther commands and options are planned for future releases.');

  // Register future commands (they will be visible in help but marked as future)
  setupFutureCommands(cli);

  return cli;
}

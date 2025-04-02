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

import { Argv } from 'yargs';

/**
 * Register future commands that are not yet implemented
 * @param yargs Yargs instance
 */
export function registerFutureCommands(yargs: Argv) {
  // These commands will be visible in help but marked as future/not implemented

  // Future validation types
  yargs.command({
    command: 'validate-threat [file]',
    describe: '[Future] Validate a threat statement JSON',
    handler: notImplementedHandler('Threat validation'),
  });

  yargs.command({
    command: 'validate-mitigation [file]',
    describe: '[Future] Validate a mitigation statement JSON',
    handler: notImplementedHandler('Mitigation validation'),
  });

  yargs.command({
    command: 'validate-assumption [file]',
    describe: '[Future] Validate an assumption statement JSON',
    handler: notImplementedHandler('Assumption validation'),
  });

  yargs.command({
    command: 'validate-threatpack [file]',
    describe: '[Future] Validate a threat pack JSON',
    handler: notImplementedHandler('Threat pack validation'),
  });

  yargs.command({
    command: 'validate-mitigationpack [file]',
    describe: '[Future] Validate a mitigation pack JSON',
    handler: notImplementedHandler('Mitigation pack validation'),
  });

  // Future conversion formats
  yargs.command({
    command: 'convert-pdf [file]',
    describe: '[Future] Convert a threat model JSON to PDF',
    handler: notImplementedHandler('PDF conversion'),
  });

  yargs.command({
    command: 'convert-docx [file]',
    describe: '[Future] Convert a threat model JSON to DOCX',
    handler: notImplementedHandler('DOCX conversion'),
  });

  // Future CRUD operations
  yargs.command({
    command: 'create <entity>',
    describe: '[Future] Create a new entity',
    handler: notImplementedHandler('Create operations'),
  });

  yargs.command({
    command: 'read <entity>',
    describe: '[Future] Read/view an entity',
    handler: notImplementedHandler('Read operations'),
  });

  yargs.command({
    command: 'update <entity>',
    describe: '[Future] Update an existing entity',
    handler: notImplementedHandler('Update operations'),
  });

  yargs.command({
    command: 'delete <entity>',
    describe: '[Future] Delete an entity',
    handler: notImplementedHandler('Delete operations'),
  });
}

/**
 * Create a handler for not implemented commands
 * @param feature Feature name
 * @returns Handler function
 */
function notImplementedHandler(feature: string) {
  return () => {
    console.log(`The ${feature} feature is not yet implemented.`);
    console.log('It will be available in a future release.');
    process.exit(0);
  };
}

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

import fs from 'fs/promises';

/**
 * Get input from a file or STDIN
 * @param filePath Optional file path to read from
 * @returns Promise that resolves to the input content as a string
 */
export async function getInput(filePath?: string): Promise<string> {
  // If file path is provided, read from file
  if (filePath) {
    return fs.readFile(filePath, 'utf8');
  }

  // Otherwise, read from STDIN
  return new Promise((resolve) => {
    let data = '';
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', () => {
      resolve(data);
    });
  });
}

/**
 * Write output to a file or STDOUT
 * @param content Content to write
 * @param outputPath Optional file path to write to
 * @returns Promise that resolves when the write operation is complete
 */
export async function writeOutput(content: string, outputPath?: string): Promise<void> {
  // If output path is provided, write to file
  if (outputPath) {
    await fs.writeFile(outputPath, content, 'utf8');
    return;
  }

  // Otherwise, write to STDOUT
  process.stdout.write(content);
}

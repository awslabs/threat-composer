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
const replacements = [
  [/\*/g, '\\*', 'asterisks'],
  [/#/g, '\\#', 'number signs'],
  [/\//g, '\\/', 'slashes'],
  [/\(/g, '\\(', 'parentheses'],
  [/\)/g, '\\)', 'parentheses'],
  [/\[/g, '\\[', 'square brackets'],
  [/\]/g, '\\]', 'square brackets'],
  [/</g, '&lt;', 'angle brackets'],
  [/>/g, '&gt;', 'angle brackets'],
  [/_/g, '\\_', 'underscores'],
  [/`/g, '\\`', 'codeblocks'],
];

const escapeMarkdown = (input: string, skips: string[] = []) => {
  return replacements.reduce((str, replacement) => {
    var name = replacement[2] as string;
    return skips.indexOf(name) !== -1
      ? str
      : str.replace(replacement[0], replacement[1] as string);
  }, input);
};

export default escapeMarkdown;

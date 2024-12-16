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
import { getTextDirection } from '@aws/threat-composer';

export const unreachable = (_: never): never => {
  throw new Error('unreachable');
};

/**
 * @internal
 */
export function invariant(cond: any, message: string): asserts cond {
  if (!cond) throw new Error(message);
}

export function bidirectionalOfText(text: string, defaultDir: boolean): boolean {
  const dir = getTextDirection(text);
  console.log('bid', text, dir, defaultDir);
  return dir === 'rtl' || (dir === 'auto' && defaultDir);
}
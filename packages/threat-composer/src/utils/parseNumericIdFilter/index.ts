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

const SINGLE_ID_REGEX = /^[a-z]*-?0*(\d+)$/i;
const RANGE_REGEX = /^[a-z]*-?0*(\d+)\s*(?:-|\.\.|to)\s*[a-z]*-?0*(\d+)$/i;

const MAX_RANGE_SIZE = 1000;

/**
 * Parses a user supplied list of entity numbers into numeric ids.
 *
 * Accepts comma, semicolon, space or newline separated values, with or without
 * an entity prefix and leading zeros, and inclusive ranges. For example
 * `T-0001, 4, 7..9, M-0012 to M-0014`.
 *
 * Invalid segments are ignored so that partially typed input does not clear the
 * whole filter. Returns a sorted list of unique numeric ids.
 */
const parseNumericIdFilter = (input?: string): number[] => {
  if (!input) {
    return [];
  }

  const ids = new Set<number>();

  input
    .split(/[,;\n\r\t]+|\s{2,}/)
    .flatMap((segment) => (segment.includes(' ') && !RANGE_REGEX.test(segment.trim()) ? segment.split(' ') : [segment]))
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0)
    .forEach((segment) => {
      const range = RANGE_REGEX.exec(segment);
      if (range) {
        const from = Number(range[1]);
        const to = Number(range[2]);
        const start = Math.min(from, to);
        const end = Math.min(Math.max(from, to), start + MAX_RANGE_SIZE - 1);
        for (let i = start; i <= end; i++) {
          ids.add(i);
        }
        return;
      }

      const single = SINGLE_ID_REGEX.exec(segment);
      if (single) {
        ids.add(Number(single[1]));
      }
    });

  return Array.from(ids).sort((a, b) => a - b);
};

export default parseNumericIdFilter;

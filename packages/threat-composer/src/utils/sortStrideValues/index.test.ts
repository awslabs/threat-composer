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
import sortStrideValues, { STRIDE_ORDER } from '.';

describe('sortStrideValues', () => {
  test('returns an empty array for missing or empty input', () => {
    expect(sortStrideValues()).toEqual([]);
    expect(sortStrideValues([])).toEqual([]);
  });

  test('sorts values into canonical STRIDE order', () => {
    expect(sortStrideValues(['E', 'I', 'S', 'D', 'R', 'T'])).toEqual(['S', 'T', 'R', 'I', 'D', 'E']);
  });

  test('canonical order matches the STRIDE data', () => {
    expect(STRIDE_ORDER).toEqual(['S', 'T', 'R', 'I', 'D', 'E']);
  });

  test('removes duplicates', () => {
    expect(sortStrideValues(['I', 'S', 'I'])).toEqual(['S', 'I']);
  });

  test('keeps unknown values after the STRIDE values', () => {
    expect(sortStrideValues(['Z', 'E', 'A', 'S'])).toEqual(['S', 'E', 'A', 'Z']);
  });
});

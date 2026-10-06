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
import parseNumericIdFilter from '.';

describe('parseNumericIdFilter', () => {
  test('returns an empty list for empty input', () => {
    expect(parseNumericIdFilter()).toEqual([]);
    expect(parseNumericIdFilter('')).toEqual([]);
    expect(parseNumericIdFilter('   ')).toEqual([]);
  });

  test('parses plain numbers', () => {
    expect(parseNumericIdFilter('3')).toEqual([3]);
    expect(parseNumericIdFilter('3, 1, 2')).toEqual([1, 2, 3]);
  });

  test('parses prefixed and zero padded ids', () => {
    expect(parseNumericIdFilter('T-0004')).toEqual([4]);
    expect(parseNumericIdFilter('m-0012, M0013')).toEqual([12, 13]);
  });

  test('parses space separated values', () => {
    expect(parseNumericIdFilter('1 4 7')).toEqual([1, 4, 7]);
  });

  test('parses inclusive ranges', () => {
    expect(parseNumericIdFilter('2-5')).toEqual([2, 3, 4, 5]);
    expect(parseNumericIdFilter('7..9')).toEqual([7, 8, 9]);
    expect(parseNumericIdFilter('M-0012 to M-0014')).toEqual([12, 13, 14]);
  });

  test('normalises reversed ranges', () => {
    expect(parseNumericIdFilter('5-2')).toEqual([2, 3, 4, 5]);
  });

  test('de-duplicates overlapping values', () => {
    expect(parseNumericIdFilter('1-3, 2, T-0003')).toEqual([1, 2, 3]);
  });

  test('ignores segments it cannot parse', () => {
    expect(parseNumericIdFilter('1, not-an-id, 2')).toEqual([1, 2]);
    expect(parseNumericIdFilter('abc')).toEqual([]);
  });

  test('caps very large ranges', () => {
    expect(parseNumericIdFilter('1-100000')).toHaveLength(1000);
  });
});

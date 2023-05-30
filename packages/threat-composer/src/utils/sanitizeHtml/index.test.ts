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
import sanitizeHtml from '.';

const testObj = {
  num: 1,
  str1: 'hello',
  str2: "world<script>alert('hello')</script>",
};

const result = {
  num: 1,
  str1: 'hello',
  str2: 'world',
};

describe('sanitizeHtml', () => {
  test('parses an object to saniztise html string if there is any', () => {
    expect(sanitizeHtml(testObj)).toEqual(result);
  });

  test('parses an array of object to saniztise html string if there is any', () => {
    expect(sanitizeHtml([testObj, testObj])).toEqual([result, result]);
  });

  test('parses nested object to saniztise html string if there is any', () => {
    expect(sanitizeHtml({
      ...testObj,
      nestedObj: testObj,
    })).toEqual({
      ...result,
      nestedObj: result,
    });
  });
});
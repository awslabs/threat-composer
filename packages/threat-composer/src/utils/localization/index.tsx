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
export function getTextDirection(text: string) {
  // Regular expression to match RTL Unicode characters
  var rtlChars =
    /[\u0600-\u06FF\u0750-\u077F\u0590-\u05FF\u08A0-\u08FF\uFB50-\uFDCF\uFDF0-\uFDFF\uFE70-\uFEFF]/;

  // Regular expression to match LTR Unicode characters
  var ltrChars =
    /[\u0000-\u05FF\u0700-\u08FF\uFB00-\uFB4F\uFB50-\uFDFF\uFE70-\uFEFF]/;

  // Count the number of RTL and LTR characters in the text
  var rtlCount = (text.match(rtlChars) || []).length;
  var ltrCount = (text.match(ltrChars) || []).length;

  // Return the text direction based on the character count
  if (rtlCount > 0 && ltrCount === 0) {
    return 'rtl';
  } else if (ltrCount > 0 && rtlCount === 0) {
    return 'ltr';
  } else {
    return 'auto';
  }
}

export function createHTMLbyDirection(innerText: string, deafultDir: string): string {
  const dir = getTextDirection(innerText);
  return `<div dir=${deafultDir && dir === 'auto' ? deafultDir : dir}>${innerText}</div>`;
}

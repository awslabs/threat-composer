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
import sanitizeHtmlString from 'sanitize-html';

const sanitizeHtml: any = (data: any) => {
  if (data) {
    if (Array.isArray(data)) {
      return data.map(d => sanitizeHtml(d));
    } else if (typeof data === 'string') {
      // Don't sanitize mermaid diagrams
      if (data.startsWith('mermaid:')) {
        return data;
      }
      return sanitizeHtmlString(data, {
        allowedTags: [],
      });
    } else if (typeof data === 'object') {
      return Object.keys(data).reduce(
        (attrs, key) => ({
          ...attrs,
          [key]: sanitizeHtml(data[key]),
        }),
        {},
      );
    }
  }

  return data;
};

export default sanitizeHtml;
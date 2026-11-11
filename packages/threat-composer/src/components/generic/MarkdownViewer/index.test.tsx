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
import { render, cleanup } from '@testing-library/react';
import MarkdownViewer from '.';

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const SVG = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciLz4=';

const imgSrc = (markdown: string, allowHtml = false) => {
  const { container } = render(<MarkdownViewer allowHtml={allowHtml}>{markdown}</MarkdownViewer>);
  return container.querySelector('img')?.getAttribute('src');
};

const linkHref = (markdown: string) => {
  const { container } = render(<MarkdownViewer>{markdown}</MarkdownViewer>);
  return container.querySelector('a')?.getAttribute('href');
};

describe('MarkdownViewer', () => {
  afterEach(cleanup);

  it.each([
    ['PNG', PNG],
    ['SVG', SVG],
  ])('keeps a base64 %s image in markdown', (_, src) => {
    expect(imgSrc(`![Architecture Diagram](${src})`)).toBe(src);
  });

  it('keeps a base64 image in an HTML img tag when HTML is allowed', () => {
    expect(imgSrc(`<img src="${PNG}" alt="Diagram" />`, true)).toBe(PNG);
  });

  it('keeps an https image', () => {
    expect(imgSrc('![Diagram](https://example.com/diagram.png)')).toBe('https://example.com/diagram.png');
  });

  it('drops a data URL that is not an image', () => {
    expect(imgSrc('![x](data:text/html;base64,PHNjcmlwdD4=)')).toBeFalsy();
  });

  it.each([
    ['a javascript URL', 'javascript:alert(1)'],
    ['a data image URL', PNG],
  ])('drops %s in a link', (_, href) => {
    expect(linkHref(`[click](${href})`)).toBeFalsy();
  });
});

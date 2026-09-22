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
import { beforeEach, describe, expect, it } from 'vitest';
import { DefaultConfig, IntegrationTypes } from '../../../popup/config';
import { isActualRawSite, isRawSite } from '../raw-file-utils';

/**
 * Raw-file detection. This is what separates "a real raw file view, read the
 * <pre> directly" from "a file viewer that merely happens to contain a code
 * block, go and fetch the raw URL". Getting it wrong either misses the button or
 * tries to parse a rendered HTML page as JSON.
 */

const goTo = (path: string) => window.history.pushState({}, '', path);

beforeEach(() => {
  document.body.innerHTML = '';
  goTo('/');
});

describe('isRawSite', () => {
  it('is true only when the page has a <pre>', () => {
    expect(isRawSite(DefaultConfig)).toBe(false);

    document.body.innerHTML = '<pre>{"schema":"1"}</pre>';
    expect(isRawSite(DefaultConfig)).toBe(true);
  });

  it('is indifferent to what the <pre> contains', () => {
    document.body.innerHTML = '<pre></pre>';
    expect(isRawSite(DefaultConfig)).toBe(true);
  });
});

describe('isActualRawSite', () => {
  beforeEach(() => {
    document.body.innerHTML = '<pre>{"schema":"1"}</pre>';
  });

  it('requires the URL to match one of the integration rawUrlPatterns', () => {
    goTo('/owner/repo/-/raw/main/model.tc.json');
    expect(isActualRawSite(DefaultConfig, IntegrationTypes.GITLAB)).toBe(true);

    goTo('/owner/repo/-/blob/main/model.tc.json');
    expect(isActualRawSite(DefaultConfig, IntegrationTypes.GITLAB)).toBe(false);
  });

  it('is false without a <pre>, however well the URL matches', () => {
    document.body.innerHTML = '<div>no pre here</div>';
    goTo('/owner/repo/-/raw/main/model.tc.json');

    expect(isActualRawSite(DefaultConfig, IntegrationTypes.GITLAB)).toBe(false);
  });

  it('is false for an integration with no rawUrlPatterns', () => {
    // CodeCatalyst ships an empty list because it has no raw view at all, so it must
    // never take the raw path no matter what the page looks like.
    expect(DefaultConfig.integrations[IntegrationTypes.CODECATALYST].rawUrlPatterns).toEqual([]);

    goTo('/raw/anything.tc.json');
    expect(isActualRawSite(DefaultConfig, IntegrationTypes.CODECATALYST)).toBe(false);
  });

  it('matches rawUrlPatterns as SUBSTRINGS, not regexes', () => {
    // Amazon Code's pattern is the literal '?raw=1'. As a regex the '?' would make
    // the preceding character optional and never match this URL; as a substring it
    // matches. Pinned because switching to regex matching here would break it.
    expect(DefaultConfig.integrations[IntegrationTypes.CODEAMAZON].rawUrlPatterns).toEqual([
      '?raw=1',
    ]);

    goTo('/packages/Thing/blobs/mainline/--/model.tc.json?raw=1');
    expect(isActualRawSite(DefaultConfig, IntegrationTypes.CODEAMAZON)).toBe(true);
  });

  it('recognises the GitHub raw host', () => {
    expect(DefaultConfig.integrations[IntegrationTypes.GITHUB].rawUrlPatterns).toEqual([
      'githubusercontent.com',
    ]);

    // Substring matching means the pattern only has to appear somewhere in the URL.
    goTo('/x?from=raw.githubusercontent.com/owner/repo/main/model.tc.json');
    expect(isActualRawSite(DefaultConfig, IntegrationTypes.GITHUB)).toBe(true);
  });

  it('is false for an unknown integration key', () => {
    expect(isActualRawSite(DefaultConfig, 'not-an-integration')).toBe(false);
  });
});

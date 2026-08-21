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
import { afterEach, describe, expect, it, vi } from 'vitest';
import { logDebugMessage } from '../debugLogger';
import { DefaultConfig } from '../entrypoints/popup/config';

/**
 * The content script runs on `<all_urls>`, so this logger is one console.log away
 * from writing to every page the user visits. That it stays silent unless debug is
 * explicitly on is the behaviour worth guarding.
 */

afterEach(() => {
  vi.restoreAllMocks();
});

describe('logDebugMessage', () => {
  it('says nothing with the shipped config', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    logDebugMessage(DefaultConfig, 'should not appear');

    expect(log).not.toHaveBeenCalled();
  });

  it('logs with an identifying prefix when debug is on', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    logDebugMessage({ ...DefaultConfig, debug: true }, 'hello');

    // The prefix is how a user tells extension output from the page's own logging.
    expect(log).toHaveBeenCalledWith('ThreatComposerExtension: hello');
  });
});

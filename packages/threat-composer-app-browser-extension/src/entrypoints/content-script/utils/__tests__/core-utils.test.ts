/* ********************************************************************************************************************
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

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DefaultConfig } from '../../../popup/config';
import {
  TC_BUTTON_ID,
  TC_BUTTON_TEXT,
  cleanupExistingThreatComposerButtons,
  createTCButton,
  extractContentDirectly,
  forwardFetchToBackground,
  isLikelyThreatComposerSchema,
  matchesAnyRegex,
  processTCCandidate,
  retryWithBackoff,
  threatComposerButtonExists,
  waitForCondition,
} from '../core-utils';

const config = DefaultConfig;

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('matchesAnyRegex', () => {
  it('matches when any entry matches, and not otherwise', () => {
    expect(matchesAnyRegex('https://github.com/a/b', ['gitlab.com', 'github.com'])).toBe(true);
    expect(matchesAnyRegex('https://example.com', ['gitlab.com', 'github.com'])).toBe(false);
  });

  it('is false for an empty pattern list', () => {
    // This is what makes a disabled or unconfigured integration inert.
    expect(matchesAnyRegex('https://github.com', [])).toBe(false);
  });

  it('treats entries as REGEXES, so unescaped dots are wildcards', () => {
    // DefaultConfig ships 'code.amazon.com' and 'github.com' unescaped, so they
    // match far more than intended. Pinned deliberately: if someone starts escaping
    // these, that is a behaviour change users could notice, not a silent tidy-up.
    expect(matchesAnyRegex('https://codeXamazonYcom/pkg', ['code.amazon.com'])).toBe(true);
    expect(matchesAnyRegex('https://githubZcom/a', ['github.com'])).toBe(true);
  });

  it('supports genuine regex syntax, which is what custom patterns rely on', () => {
    expect(matchesAnyRegex('https://git.internal.corp/x', ['^https://git\\.internal\\.corp/'])).toBe(
      true,
    );
    expect(matchesAnyRegex('https://evil.com/?q=git.internal.corp', ['^https://git\\.internal\\.corp/'])).toBe(
      false,
    );
  });
});

describe('isLikelyThreatComposerSchema', () => {
  it('accepts an object carrying a schema', () => {
    expect(isLikelyThreatComposerSchema({ schema: '1.0.0' })).toBe(true);
  });

  it('rejects anything without one', () => {
    // The only thing standing between a user and the extension offering to open
    // arbitrary JSON as a threat model.
    expect(isLikelyThreatComposerSchema({})).toBe(false);
    expect(isLikelyThreatComposerSchema({ applicationInfo: {} } as never)).toBe(false);
  });

  it('rejects a falsy schema value', () => {
    expect(isLikelyThreatComposerSchema({ schema: '' })).toBe(false);
  });
});

describe('the injected button', () => {
  it('is created disabled, named, and timestamped', () => {
    const button = createTCButton();

    expect(button.id).toBe(TC_BUTTON_ID);
    expect(button.textContent).toBe(TC_BUTTON_TEXT);
    expect(button.disabled).toBe(true);
    // shouldSkipProcessing uses this to tell a freshly-created button from a stale
    // one, so its absence changes behaviour.
    expect(button.getAttribute('data-tc-creation-time')).toMatch(/^\d+$/);
  });

  it('is detected once in the document', () => {
    expect(threatComposerButtonExists()).toBe(false);
    document.body.appendChild(createTCButton());
    expect(threatComposerButtonExists()).toBe(true);
  });

  it('is removed by cleanup', () => {
    document.body.appendChild(createTCButton());
    cleanupExistingThreatComposerButtons(config);
    expect(threatComposerButtonExists()).toBe(false);
  });

  it('takes its wrapper with it when it is the only child', () => {
    const wrapper = document.createElement('div');
    wrapper.id = 'wrapper';
    wrapper.appendChild(createTCButton());
    document.body.appendChild(wrapper);

    cleanupExistingThreatComposerButtons(config);

    // GitHub wraps the button in a container div of its own, which would otherwise
    // be left behind as an empty artefact on every SPA navigation.
    expect(document.getElementById('wrapper')).toBeNull();
  });

  it('leaves a shared wrapper in place', () => {
    const wrapper = document.createElement('div');
    wrapper.id = 'wrapper';
    wrapper.appendChild(document.createElement('span'));
    wrapper.appendChild(createTCButton());
    document.body.appendChild(wrapper);

    cleanupExistingThreatComposerButtons(config);

    expect(document.getElementById('wrapper')).not.toBeNull();
    expect(threatComposerButtonExists()).toBe(false);
  });
});

describe('extractContentDirectly', () => {
  it('prefers a <pre>, which is what a raw file view renders', async () => {
    document.body.innerHTML = '<pre>  {"schema":"1"}  </pre><code>{"other":1}</code>';
    await expect(extractContentDirectly(config)).resolves.toBe('{"schema":"1"}');
  });

  it('falls back to <code>', async () => {
    document.body.innerHTML = '<code> {"schema":"2"} </code>';
    await expect(extractContentDirectly(config)).resolves.toBe('{"schema":"2"}');
  });

  it('falls back to the body when it looks like JSON', async () => {
    document.body.textContent = '{"schema":"3"}';
    await expect(extractContentDirectly(config)).resolves.toBe('{"schema":"3"}');
  });

  it('returns null when the body is not JSON-shaped', async () => {
    document.body.textContent = 'just a web page';
    await expect(extractContentDirectly(config)).resolves.toBeNull();
  });
});

describe('processTCCandidate', () => {
  it('enables a <button> for a real threat model', async () => {
    const button = createTCButton();
    document.body.appendChild(button);

    await processTCCandidate('{"schema":"1"}', button, config);

    expect(button.disabled).toBe(false);
  });

  it('enables an <a> by restoring pointer events', async () => {
    const anchor = document.createElement('a');
    anchor.style.pointerEvents = 'none';
    document.body.appendChild(anchor);

    await processTCCandidate('{"schema":"1"}', anchor, config);

    expect(anchor.style.pointerEvents).toBe('auto');
  });

  it('leaves the button alone when the JSON has no schema', async () => {
    const button = createTCButton();
    document.body.appendChild(button);

    await processTCCandidate('{"notAThreatModel":true}', button, config);

    expect(button.disabled).toBe(true);
  });

  it('swallows unparseable content rather than throwing into the page', async () => {
    const button = createTCButton();
    document.body.appendChild(button);

    // A content script that throws here would surface as a page error on every
    // file view of the wrong type.
    await expect(processTCCandidate('<html>not json', button, config)).resolves.toBeUndefined();
    expect(button.disabled).toBe(true);
  });
});

describe('forwardFetchToBackground', () => {
  it('resolves with the background response', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).browser.runtime.sendMessage.mockResolvedValue({ schema: '1' });

    await expect(forwardFetchToBackground({ url: 'https://x/y.tc.json' })).resolves.toEqual({
      schema: '1',
    });
  });

  it('throws when the background answers with nothing', async () => {
    // background.ts only replies for requests carrying `schema` or `url`; anything
    // else leaves the message unanswered, which surfaces here.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).browser.runtime.sendMessage.mockResolvedValue(undefined);

    await expect(forwardFetchToBackground({ url: 'https://x' })).rejects.toThrow(
      'No response received from background script',
    );
  });
});

describe('retryWithBackoff', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the first truthy result without waiting', async () => {
    const operation = vi.fn().mockReturnValue('found');

    await expect(retryWithBackoff(operation, {}, config)).resolves.toBe('found');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('retries a falsy result and succeeds later', async () => {
    const operation = vi.fn().mockReturnValueOnce(null).mockReturnValueOnce('found');

    const result = retryWithBackoff(operation, { baseDelay: 100 }, config);
    await vi.advanceTimersByTimeAsync(100);

    await expect(result).resolves.toBe('found');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('backs off exponentially', async () => {
    const operation = vi.fn().mockReturnValue(null);

    const result = retryWithBackoff(operation, { maxRetries: 4, baseDelay: 100 }, config);

    // 100, 200, 400 between the four attempts.
    await vi.advanceTimersByTimeAsync(99);
    expect(operation).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(operation).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(200);
    expect(operation).toHaveBeenCalledTimes(3);
    await vi.advanceTimersByTimeAsync(400);
    expect(operation).toHaveBeenCalledTimes(4);

    await expect(result).resolves.toBeNull();
  });

  it('gives up with null after the retry budget', async () => {
    const operation = vi.fn().mockReturnValue(null);

    const result = retryWithBackoff(operation, { maxRetries: 2, baseDelay: 10 }, config);
    await vi.advanceTimersByTimeAsync(1000);

    await expect(result).resolves.toBeNull();
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('treats a throw as a failed attempt rather than propagating', async () => {
    const operation = vi
      .fn()
      .mockImplementationOnce(() => {
        throw new Error('DOM not ready');
      })
      .mockReturnValueOnce('found');

    const result = retryWithBackoff(operation, { baseDelay: 10 }, config);
    await vi.advanceTimersByTimeAsync(10);

    await expect(result).resolves.toBe('found');
  });
});

describe('waitForCondition', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns true immediately when already satisfied', async () => {
    await expect(waitForCondition(() => true, {}, config, 'ready')).resolves.toBe(true);
  });

  it('waits for the condition to become true', async () => {
    let ready = false;
    const result = waitForCondition(() => ready, { checkInterval: 50 }, config, 'ready');

    await vi.advanceTimersByTimeAsync(120);
    ready = true;
    await vi.advanceTimersByTimeAsync(50);

    await expect(result).resolves.toBe(true);
  });

  it('gives up with false after the budget', async () => {
    const result = waitForCondition(
      () => false,
      { maxWaitTime: 200, checkInterval: 50 },
      config,
      'never',
    );

    await vi.advanceTimersByTimeAsync(400);

    await expect(result).resolves.toBe(false);
  });
});

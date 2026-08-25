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

import { beforeEach, describe, expect, it } from 'vitest';
import { DefaultConfig } from '../../../popup/config';
import { TC_BUTTON_ID, createTCButton } from '../core-utils';
import {
  createSPAState,
  handleSPANavigation,
  handleSameFileNavigation,
  incrementSPARetryCount,
  markSPAProcessingComplete,
  resetSPAState,
  setSPARetryState,
  shouldSkipProcessing,
} from '../spa-utils';

/**
 * The SPA state machine. GitHub, GitLab, Bitbucket and CodeCatalyst all navigate
 * without a document load, so this is what stops the extension either missing a
 * navigation or re-injecting its button on every DOM mutation (a MutationObserver
 * fires the handler continuously).
 */

const config = DefaultConfig;

const goTo = (path: string) => window.history.pushState({}, '', path);

beforeEach(() => {
  document.body.innerHTML = '';
  goTo('/');
});

describe('state factory and transitions', () => {
  it('starts with an empty previousUrl so the first pass counts as a navigation', () => {
    expect(createSPAState()).toEqual({
      previousUrl: '',
      stopProcessing: false,
      retryCount: 0,
      isRetrying: false,
    });
  });

  it('resets everything', () => {
    const state = { previousUrl: '/x', stopProcessing: true, retryCount: 4, isRetrying: true };
    resetSPAState(state);
    expect(state).toEqual({
      previousUrl: '/x',
      stopProcessing: false,
      retryCount: 0,
      isRetrying: false,
    });
  });

  it('marks processing complete without clearing previousUrl', () => {
    const state = { previousUrl: '/x', stopProcessing: false, retryCount: 3, isRetrying: true };
    markSPAProcessingComplete(state);
    expect(state).toEqual({
      previousUrl: '/x',
      stopProcessing: true,
      retryCount: 0,
      isRetrying: false,
    });
  });

  it('clears the retry count when retrying stops, but not when it starts', () => {
    const state = createSPAState();
    state.retryCount = 3;

    setSPARetryState(state, true);
    expect(state).toMatchObject({ isRetrying: true, retryCount: 3 });

    setSPARetryState(state, false);
    expect(state).toMatchObject({ isRetrying: false, retryCount: 0 });
  });

  it('increments and returns the retry count', () => {
    const state = createSPAState();
    expect(incrementSPARetryCount(state)).toBe(1);
    expect(incrementSPARetryCount(state)).toBe(2);
    expect(state.retryCount).toBe(2);
  });
});

describe('handleSPANavigation', () => {
  it('reports a navigation the first time and records the URL', () => {
    const state = createSPAState();
    goTo('/owner/repo/blob/main/model.tc.json');

    expect(handleSPANavigation(state, config, 'github')).toBe(true);
    expect(state.previousUrl).toBe(window.location.href);
  });

  it('reports no navigation when the URL has not changed', () => {
    const state = createSPAState();
    goTo('/a.tc.json');
    handleSPANavigation(state, config, 'github');

    expect(handleSPANavigation(state, config, 'github')).toBe(false);
  });

  it('resets stale state and removes the previous page button on navigation', () => {
    const state = { previousUrl: '/a', stopProcessing: true, retryCount: 5, isRetrying: true };
    document.body.appendChild(createTCButton());
    goTo('/b.tc.json');

    expect(handleSPANavigation(state, config, 'github')).toBe(true);
    expect(state).toMatchObject({ stopProcessing: false, retryCount: 0, isRetrying: false });
    // Otherwise the button from the previous file would linger, still wired to the
    // old model.
    expect(document.getElementById(TC_BUTTON_ID)).toBeNull();
  });
});

describe('handleSameFileNavigation', () => {
  const fileExtension = new RegExp(config.fileExtension);

  it('reopens processing when back on a model file with no button', () => {
    // Navigating away and back to the same file leaves the URL unchanged, so
    // handleSPANavigation sees nothing; without this the button never returns.
    const state = { previousUrl: '/a.tc.json', stopProcessing: true, retryCount: 2, isRetrying: false };
    goTo('/a.tc.json');

    handleSameFileNavigation(state, config, fileExtension);

    expect(state).toMatchObject({ stopProcessing: false, retryCount: 0, isRetrying: false });
  });

  it('leaves state alone while a button is present', () => {
    const state = { previousUrl: '/a.tc.json', stopProcessing: true, retryCount: 0, isRetrying: false };
    goTo('/a.tc.json');
    document.body.appendChild(createTCButton());

    handleSameFileNavigation(state, config, fileExtension);

    expect(state.stopProcessing).toBe(true);
  });

  it('leaves state alone on a file it does not handle', () => {
    const state = { previousUrl: '/a.md', stopProcessing: true, retryCount: 0, isRetrying: false };
    goTo('/notes.md');

    handleSameFileNavigation(state, config, fileExtension);

    expect(state.stopProcessing).toBe(true);
  });
});

describe('shouldSkipProcessing', () => {
  it('skips while a retry is in flight', () => {
    const state = { ...createSPAState(), isRetrying: true };
    expect(shouldSkipProcessing(state, config)).toBe(true);
  });

  it('does not skip when there is no button', () => {
    expect(shouldSkipProcessing(createSPAState(), config)).toBe(false);
  });

  it('skips when a working button is already there', () => {
    // The MutationObserver fires on every DOM change, so without this the handler
    // would rebuild its button continuously.
    const button = createTCButton();
    button.disabled = false;
    button.onclick = () => undefined;
    // Age it past the 500ms grace period on BOTH clocks the function reads. Leaving
    // `_tcCreationTime` at "now" lets the test pass through the newly-created branch
    // instead, which hides a broken functional-button check — verified by mutation.
    const old = Date.now() - 5000;
    button.setAttribute('data-tc-creation-time', String(old));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (button as any)._tcCreationTime = old;
    document.body.appendChild(button);

    expect(shouldSkipProcessing(createSPAState(), config)).toBe(true);
    // And it must still be there, not cleaned up.
    expect(document.getElementById(TC_BUTTON_ID)).not.toBeNull();
  });

  it('skips a button that was only just created, to let its fetch finish', () => {
    const button = createTCButton();
    document.body.appendChild(button);

    expect(shouldSkipProcessing(createSPAState(), config)).toBe(true);
  });

  it('replaces a stale, never-enabled button', () => {
    const button = createTCButton();
    // Older than the 500ms grace period and still disabled: the fetch failed.
    button.setAttribute('data-tc-creation-time', String(Date.now() - 5000));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (button as any)._tcCreationTime = Date.now() - 5000;
    document.body.appendChild(button);

    expect(shouldSkipProcessing(createSPAState(), config)).toBe(false);
    expect(document.getElementById(TC_BUTTON_ID)).toBeNull();
  });

  it('skips forever when the button carries no creation timestamp', () => {
    // Documents a real quirk rather than endorsing it: the GitLab and CodeCatalyst
    // handlers build their anchors by hand and never set data-tc-creation-time, so
    // this branch always wins and such a button is never replaced, even if its
    // fetch failed and it stayed inert. Reachable only via those two handlers.
    const anchor = document.createElement('a');
    anchor.id = TC_BUTTON_ID;
    anchor.style.pointerEvents = 'none';
    document.body.appendChild(anchor);

    expect(shouldSkipProcessing(createSPAState(), config)).toBe(true);
    expect(document.getElementById(TC_BUTTON_ID)).not.toBeNull();
  });
});

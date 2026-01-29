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

import { logDebugMessage } from '../../../debugLogger';
import { TCConfig } from '../../popup/config';
import { TCJSONSimplifiedSchema, RetryOptions, DOMWaitOptions } from '../types';

// WXT framework imports
declare const browser: any;

export const TC_BUTTON_TEXT = 'View in Threat Composer';
export const TC_BUTTON_ID = 'threatComposerButton';

/**
 * Check if content looks like a Threat Composer schema
 */
export function isLikelyThreatComposerSchema(JSONobj: TCJSONSimplifiedSchema): boolean {
  return JSONobj.schema ? true : false;
}

/**
 * Check if a Threat Composer button already exists
 */
export function threatComposerButtonExists(): boolean {
  return document.getElementById(TC_BUTTON_ID) !== null;
}

/**
 * Clean up any existing Threat Composer buttons
 */
export function cleanupExistingThreatComposerButtons(config: TCConfig): void {
  const existingButtons = document.querySelectorAll(`#${TC_BUTTON_ID}`);
  if (existingButtons.length > 0) {
    logDebugMessage(config, `Cleaning up ${existingButtons.length} existing Threat Composer button(s)`);
    existingButtons.forEach(button => {
      // Remove the button and its container if it exists
      const container = button.closest('div');
      if (container && container.children.length === 1 && container.children[0] === button) {
        container.remove();
      } else {
        button.remove();
      }
    });
  }
}

/**
 * Create a basic Threat Composer button
 */
export function createTCButton(): HTMLButtonElement {
  const tcButton = document.createElement('button');
  tcButton.textContent = TC_BUTTON_TEXT;
  tcButton.id = TC_BUTTON_ID;
  tcButton.disabled = true;

  // Add creation timestamp to prevent premature removal
  tcButton.setAttribute('data-tc-creation-time', Date.now().toString());
  (tcButton as any)._tcCreationTime = Date.now();

  return tcButton;
}

/**
 * Forward fetch request to background script
 */
export function forwardFetchToBackground(message: any): Promise<TCJSONSimplifiedSchema> {
  return browser.runtime.sendMessage(message).then((response: any) => {
    if (browser.runtime.lastError) {
      throw new Error(browser.runtime.lastError.message);
    }
    if (!response) {
      throw new Error('No response received from background script');
    }
    return response;
  });
}

/**
 * Process a Threat Composer candidate and enable button if valid
 */
export async function processTCCandidate(
  content: string,
  element: HTMLElement,
  config: TCConfig,
): Promise<void> {
  try {
    // Try to parse the content as JSON
    const jsonObj: TCJSONSimplifiedSchema = JSON.parse(content);

    if (isLikelyThreatComposerSchema(jsonObj)) {
      logDebugMessage(config,
        'Looks like it could be a Threat Composer file, enabling ' +
        element.textContent +
        ' button',
      );

      element.onclick = function () {
        logDebugMessage(config,
          'Sending message with candidate JSON object back to service worker / background script',
        );
        browser.runtime.sendMessage(jsonObj);
      };

      switch (element.tagName) {
        case 'BUTTON':
          (element as HTMLInputElement).disabled = false;
          break;
        case 'A':
          element.style.pointerEvents = 'auto';
          break;
      }
    } else {
      logDebugMessage(config,
        "Does NOT look like it's a Threat Composer file, NOT enabling " +
        element.textContent +
        ' button',
      );
    }
  } catch (error) {
    logDebugMessage(config, 'Error parsing JSON content: ' + (error as Error).message);
  }
}

/**
 * Get Threat Composer JSON candidate via background fetch
 */
export async function getTCJSONCandidate(
  url: string,
  element: HTMLElement,
  tcConfig: TCConfig,
): Promise<void> {
  return forwardFetchToBackground({ url: url })
    .then(function (tcJSONCandidate) {
      logDebugMessage(tcConfig, 'Able to get a JSON candidate');
      if (tcJSONCandidate && isLikelyThreatComposerSchema(tcJSONCandidate)) {
        logDebugMessage(tcConfig,
          'Looks like it could be a Threat Composer file, enabling ' +
          element.textContent +
          ' button',
        );
        element.onclick = function () {
          logDebugMessage(tcConfig,
            'Sending message with candidate JSON object back service worker / background script',
          );
          browser.runtime.sendMessage(tcJSONCandidate);
        };

        switch (element.tagName) { //"Enable" button / anchor
          case 'BUTTON':
            (element as HTMLInputElement).disabled = false;
            (element as HTMLInputElement).style.pointerEvents = 'auto';
            break;
          case 'A': //Anchor
            element.style.pointerEvents = 'auto';
            break;
        }

      } else {
        logDebugMessage(tcConfig,
          "Does NOT look like it's a Threat Composer file, NOT enabling " +
          element.textContent +
          ' button',
        );
      }
    })
    .catch(function (error) {
      logDebugMessage(tcConfig, 'Error during fetch: ' + error.message);
    });
}

/**
 * Retry helper function with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T> | T,
  options: RetryOptions = {},
  config: TCConfig,
): Promise<T | null> {
  const {
    maxRetries = 5,
    baseDelay = 100,
    operationName = 'operation',
  } = options;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await operation();
      if (result) {
        if (attempt > 0) {
          logDebugMessage(config, `${operationName} succeeded on attempt ${attempt + 1}`);
        }
        return result;
      }
    } catch (error) {
      logDebugMessage(config, `${operationName} failed on attempt ${attempt + 1}: ${(error as Error).message}`);
    }

    if (attempt < maxRetries - 1) {
      const delay = baseDelay * Math.pow(2, attempt);
      logDebugMessage(config, `${operationName} attempt ${attempt + 1} failed, retrying in ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  logDebugMessage(config, `${operationName} failed after ${maxRetries} attempts`);
  return null;
}

/**
 * Wait for a condition to be met with timeout
 */
export async function waitForCondition(
  condition: () => boolean,
  options: DOMWaitOptions = {},
  config: TCConfig,
  conditionName: string = 'condition',
): Promise<boolean> {
  const {
    maxWaitTime = 3000,
    checkInterval = 50,
  } = options;

  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitTime) {
    if (condition()) {
      logDebugMessage(config, `${conditionName} is ready`);
      return true;
    }

    // Wait before checking again
    await new Promise(resolve => setTimeout(resolve, checkInterval));
  }

  logDebugMessage(config, `${conditionName} not ready after ${maxWaitTime}ms`);
  return false;
}

/**
 * Check if URL matches any regex in array
 */
export function matchesAnyRegex(url: string, regexArray: string[]): boolean {
  return regexArray.some(regex => new RegExp(regex).test(url));
}

/**
 * Extract content directly from DOM (for sandboxed environments)
 */
export async function extractContentDirectly(config: TCConfig): Promise<string | null> {
  try {
    // Try multiple strategies to extract content from the DOM

    // Strategy 1: Look for <pre> tag (common in raw file views)
    const preElement = document.querySelector('pre');
    if (preElement && preElement.textContent) {
      logDebugMessage(config, 'Found content in <pre> element');
      return preElement.textContent.trim();
    }

    // Strategy 2: Look for code blocks
    const codeElement = document.querySelector('code');
    if (codeElement && codeElement.textContent) {
      logDebugMessage(config, 'Found content in <code> element');
      return codeElement.textContent.trim();
    }

    // Strategy 3: Try body text content as fallback
    const bodyText = document.body.textContent;
    if (bodyText && bodyText.trim().startsWith('{')) {
      logDebugMessage(config, 'Found JSON-like content in body');
      return bodyText.trim();
    }

    logDebugMessage(config, 'No suitable content found in DOM');
    return null;
  } catch (error) {
    logDebugMessage(config, 'Error during direct content extraction: ' + (error as Error).message);
    return null;
  }
}

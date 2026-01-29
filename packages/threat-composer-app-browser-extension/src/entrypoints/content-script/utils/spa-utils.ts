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
import { SPAIntegrationState } from '../types';
import { cleanupExistingThreatComposerButtons, threatComposerButtonExists, TC_BUTTON_ID } from './core-utils';

/**
 * Check if we should skip processing for SPA integrations
 */
export function shouldSkipProcessing(state: SPAIntegrationState, config: TCConfig): boolean {
  // If we're currently retrying, skip to avoid concurrent attempts
  if (state.isRetrying) {
    return true;
  }

  // Check if there's a valid, functional button already present
  const existingButton = document.getElementById(TC_BUTTON_ID);
  if (existingButton) {
    // Check if the button is properly functional (has click handler and is enabled)
    const isEnabled = existingButton.tagName === 'BUTTON' ?
      !(existingButton as HTMLButtonElement).disabled :
      existingButton.style.pointerEvents !== 'none';

    const hasClickHandler = (existingButton as any).onclick !== null;

    if (isEnabled && hasClickHandler) {
      logDebugMessage(config, 'Functional Threat Composer button already exists, skipping');
      return true;
    } else {
      // Check if button was just created (give async operations time to complete)
      const buttonAge = Date.now() - (existingButton as any)._tcCreationTime;
      if (!existingButton.hasAttribute('data-tc-creation-time') || buttonAge < 500) {
        // Button is new, give it time for async operations to complete
        logDebugMessage(config, 'Found newly created Threat Composer button, allowing time for async operations');
        return true;
      }

      logDebugMessage(config, 'Found non-functional Threat Composer button, will replace it');
      cleanupExistingThreatComposerButtons(config);
      return false;
    }
  }

  return false;
}

/**
 * Handle SPA navigation detection and state reset
 */
export function handleSPANavigation(state: SPAIntegrationState, config: TCConfig, platformName: string): boolean {
  if (window.location.href != state.previousUrl) {
    logDebugMessage(config, `${platformName} SPA navigation detected: ${state.previousUrl} -> ${window.location.href}`);
    state.previousUrl = window.location.href;
    state.stopProcessing = false;
    state.retryCount = 0;
    state.isRetrying = false;
    // Clean up any existing buttons from the previous page
    cleanupExistingThreatComposerButtons(config);
    return true; // Navigation occurred
  }
  return false; // No navigation
}

/**
 * Handle same-file navigation reset for SPA integrations
 */
export function handleSameFileNavigation(
  state: SPAIntegrationState,
  config: TCConfig,
  fileExtensionRegex: RegExp,
): void {
  // Special case: if we're on a .tc.json file but don't have a button, reset state
  // This handles the case where we navigate away and back to the same file
  if (window.location.href.match(fileExtensionRegex) && !threatComposerButtonExists() && state.stopProcessing) {
    logDebugMessage(config, 'On .tc.json file without button but processing stopped - resetting state for same-file navigation');
    state.stopProcessing = false;
    state.retryCount = 0;
    state.isRetrying = false;
  }
}

/**
 * Create initial SPA state
 */
export function createSPAState(): SPAIntegrationState {
  return {
    previousUrl: '',
    stopProcessing: false,
    retryCount: 0,
    isRetrying: false,
  };
}

/**
 * Reset SPA state for new processing
 */
export function resetSPAState(state: SPAIntegrationState): void {
  state.stopProcessing = false;
  state.retryCount = 0;
  state.isRetrying = false;
}

/**
 * Mark SPA processing as complete
 */
export function markSPAProcessingComplete(state: SPAIntegrationState): void {
  state.stopProcessing = true;
  state.retryCount = 0;
  state.isRetrying = false;
}

/**
 * Set SPA retry state
 */
export function setSPARetryState(state: SPAIntegrationState, isRetrying: boolean): void {
  state.isRetrying = isRetrying;
  if (!isRetrying) {
    // Reset retry count when we're done retrying
    state.retryCount = 0;
  }
}

/**
 * Increment SPA retry count
 */
export function incrementSPARetryCount(state: SPAIntegrationState): number {
  state.retryCount++;
  return state.retryCount;
}

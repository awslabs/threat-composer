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
import { TCConfig, IntegrationTypes } from '../../popup/config';
import { TCCodeCatalystState, TCJSONSimplifiedSchema } from '../types';
import { SPAIntegrationHandler } from './spa-handler';
import { waitForCondition, retryWithBackoff, TC_BUTTON_TEXT, TC_BUTTON_ID } from '../utils/core-utils';

// WXT framework imports
declare const browser: any;

/**
 * CodeCatalyst integration handler with hardcoded DOM operations
 */
export class CodeCatalystHandler extends SPAIntegrationHandler {
  constructor(config: TCConfig, state: TCCodeCatalystState) {
    super(config, state, IntegrationTypes.CODECATALYST);
  }

  /**
   * Handle CodeCatalyst-specific integration logic
   */
  protected async handleIntegrationSpecific(): Promise<void> {
    if (!this.matchesFileExtension()) {
      return;
    }

    await this.handleCodeCatalystCodeViewer();
  }

  /**
   * Handle CodeCatalyst code viewer with hardcoded DOM operations
   */
  private async handleCodeCatalystCodeViewer(): Promise<void> {
    // Skip if already processing or retrying
    if (this.isProcessingStopped() || this.isRetrying()) {
      return;
    }

    // Wait for CodeCatalyst's file viewer to be ready
    this.logDebug('Waiting for CodeCatalyst file viewer to be ready...');
    const isReady = await waitForCondition(
      () => this.isCodeCatalystFileViewerReady(),
      { maxWaitTime: 3000, checkInterval: 50 },
      this.config,
      'CodeCatalyst file viewer',
    );

    if (!isReady) {
      this.logDebug('CodeCatalyst file viewer not ready, will retry on next mutation');
      return;
    }

    // Set retry flag to prevent concurrent attempts
    this.setRetryState(true);

    try {
      // Use retry mechanism to find action element
      const actionElement = await retryWithBackoff(
        () => this.findCodeCatalystActionElement(),
        {
          maxRetries: 5,
          baseDelay: 100,
          operationName: 'CodeCatalyst action element detection',
        },
        this.config,
      );

      if (actionElement && !this.isProcessingStopped()) {
        this.markProcessingComplete();

        this.logDebug('Successfully found CodeCatalyst action element with retry mechanism');

        // Smart button insertion with dynamic styling
        const tcButton = this.insertCodeCatalystThreatComposerButton(actionElement);

        this.logDebug('CodeCatalyst button inserted and configured');
      } else if (!actionElement) {
        const retryCount = this.incrementRetryCount();
        this.logDebug(`Could not find CodeCatalyst action element with any strategy (attempt ${retryCount})`);

        // If we've failed multiple times, log additional debug info
        if (retryCount >= 3) {
          this.logDebug(`CodeCatalyst DOM state - File viewer ready: ${this.isCodeCatalystFileViewerReady()}, URL: ${window.location.href}`);
          this.logDebug(`Available action elements: ${document.querySelectorAll('[class*="cs-Tabs"], [class*="file-actions"], [class*="toolbar"]').length}`);
        }
      }
    } catch (error) {
      this.logDebug(`Error in CodeCatalyst action element detection: ${(error as Error).message}`);
    } finally {
      this.setRetryState(false);
    }
  }

  /**
   * Check if CodeCatalyst's file viewer is ready - HARDCODED DOM LOGIC
   */
  private isCodeCatalystFileViewerReady(): boolean {
    // Check for key CodeCatalyst file viewer elements
    const fileViewer = document.querySelector('.cs-Tabs__tab-header-actions') ||
      document.querySelector('[class*="file-viewer"]') ||
      document.querySelector('[class*="code-viewer"]');

    // Check if we're not in a loading state
    const isLoading = document.querySelector('.cs-spinner') ||
      document.querySelector('.loading') ||
      document.querySelector('[class*="loading"]');

    return fileViewer !== null && !isLoading;
  }

  /**
   * Multi-strategy CodeCatalyst action button detection - HARDCODED DOM LOGIC
   */
  private findCodeCatalystActionElement(): HTMLElement | null {
    // Strategy 1: Look for the tab header actions container (most reliable)
    let actionElement = document.getElementsByClassName('cs-Tabs__tab-header-actions')[0] as HTMLElement;
    if (actionElement && actionElement.hasChildNodes()) {
      return actionElement;
    }

    // Strategy 2: Look for file action buttons container
    const actionElement2 = document.querySelector('[class*="file-actions"]') as HTMLElement;
    if (actionElement2) return actionElement2;

    // Strategy 3: Look for toolbar or header actions
    const actionElement3 = document.querySelector('[class*="toolbar"]') as HTMLElement;
    if (actionElement3) return actionElement3;

    return null;
  }

  /**
   * Extract styling from existing CodeCatalyst buttons dynamically - HARDCODED DOM LOGIC
   */
  private extractCodeCatalystButtonStyling(actionElement: HTMLElement): { classes: string; attributes: Record<string, string> } {
    const currentAnchor = actionElement.firstChild as HTMLElement | null;
    const classes = currentAnchor?.classList.toString() || '';
    const attributes: Record<string, string> = {};

    // Extract common button attributes that CodeCatalyst uses
    const attributesToCopy = ['data-testid', 'role', 'aria-label'];

    if (currentAnchor) {
      attributesToCopy.forEach(attr => {
        const value = currentAnchor.getAttribute(attr);
        if (value !== null) {
          attributes[attr] = value;
        }
      });
    }

    return { classes, attributes };
  }

  /**
   * Smart button insertion for CodeCatalyst - HARDCODED DOM LOGIC
   */
  private insertCodeCatalystThreatComposerButton(actionElement: HTMLElement): HTMLElement {
    const tcButton = document.createElement('a');
    tcButton.id = TC_BUTTON_ID;

    // Extract actual styling from existing buttons
    const { classes, attributes } = this.extractCodeCatalystButtonStyling(actionElement);

    // Apply the extracted classes and attributes
    tcButton.setAttribute('class', classes);

    Object.entries(attributes).forEach(([key, value]) => {
      tcButton.setAttribute(key, value);
    });

    // Create the span element to match CodeCatalyst's structure
    const currentAnchor = actionElement.firstChild as HTMLElement | null;
    const currentSpan = currentAnchor?.firstChild as HTMLElement | null;

    const tcSpan = document.createElement('span');
    tcSpan.setAttribute('class', currentSpan?.classList.toString() || '');
    tcSpan.textContent = TC_BUTTON_TEXT;

    tcButton.appendChild(tcSpan);

    // Set up the click handler for CodeCatalyst's specific raw content extraction
    tcButton.onclick = () => {
      if (document.getElementById('raw-div')) {
        const rawText = document.getElementById('raw-div')!.textContent;
        if (rawText) {
          try {
            const jsonObj: TCJSONSimplifiedSchema = JSON.parse(rawText);
            logDebugMessage(this.config,
              'Sending message with candidate JSON object back service worker / background script',
            );
            browser.runtime.sendMessage(jsonObj);
          } catch (error) {
            logDebugMessage(this.config, 'Error parsing CodeCatalyst raw content: ' + (error as Error).message);
          }
        }
      }
    };

    // Insert the button into the actions container
    actionElement.appendChild(tcButton);

    this.logDebug('Inserted Threat Composer button in CodeCatalyst UI with extracted styling');

    return tcButton;
  }
}

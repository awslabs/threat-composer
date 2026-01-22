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

import { TCConfig, IntegrationTypes } from '../../popup/config';
import { TCBitbucketState } from '../types';
import { SPAIntegrationHandler } from './spa-handler';
import { waitForCondition, retryWithBackoff, getTCJSONCandidate, TC_BUTTON_ID, TC_BUTTON_TEXT } from '../utils/core-utils';

/**
 * Bitbucket integration handler with hardcoded DOM operations
 */
export class BitbucketHandler extends SPAIntegrationHandler {
  constructor(config: TCConfig, state: TCBitbucketState) {
    super(config, state, IntegrationTypes.BITBUCKET);
  }

  /**
   * Handle Bitbucket-specific integration logic
   */
  protected async handleIntegrationSpecific(): Promise<void> {
    if (!this.matchesFileExtension()) {
      return;
    }

    await this.handleBitbucketCodeViewer();
  }

  /**
   * Handle Bitbucket code viewer with hardcoded DOM operations
   */
  private async handleBitbucketCodeViewer(): Promise<void> {
    // Skip if already processing or retrying
    if (this.isProcessingStopped() || this.isRetrying()) {
      return;
    }

    // Wait for Bitbucket's file viewer to be ready
    this.logDebug('Waiting for Bitbucket file viewer to be ready...');
    const isReady = await waitForCondition(
      () => this.isBitbucketFileViewerReady(),
      { maxWaitTime: 3000, checkInterval: 50 },
      this.config,
      'Bitbucket file viewer',
    );

    if (!isReady) {
      this.logDebug('Bitbucket file viewer not ready, will retry on next mutation');
      return;
    }

    // Set retry flag to prevent concurrent attempts
    this.setRetryState(true);

    try {
      // Use retry mechanism to find raw button template
      const rawButtonTemplate = await retryWithBackoff(
        () => this.findBitbucketRawButtonTemplate(),
        {
          maxRetries: 5,
          baseDelay: 100,
          operationName: 'Bitbucket raw button template detection',
        },
        this.config,
      );

      if (rawButtonTemplate && !this.isProcessingStopped()) {
        this.markProcessingComplete();

        this.logDebug('Successfully found Bitbucket raw button template with retry mechanism');

        // Smart button insertion with dynamic styling
        const tcButton = this.insertBitbucketThreatComposerButton(rawButtonTemplate);

        // Robust URL construction
        const url = this.getBitbucketRawUrl();
        this.logDebug('Using raw URL: ' + url);

        this.logDebug('Proactively attempting to retrieve candidate');
        await getTCJSONCandidate(url, tcButton, this.config);
      } else if (!rawButtonTemplate) {
        const retryCount = this.incrementRetryCount();
        this.logDebug(`Could not find Bitbucket raw button template with any strategy (attempt ${retryCount})`);

        // If we've failed multiple times, log additional debug info
        if (retryCount >= 3) {
          this.logDebug(`Bitbucket DOM state - File viewer ready: ${this.isBitbucketFileViewerReady()}, URL: ${window.location.href}`);
          this.logDebug(`Available file actions: ${document.querySelectorAll("[data-testid='file-actions']").length}, Action buttons: ${document.querySelectorAll("[data-qa='bk-file__action-button']").length}`);
        }
      }
    } catch (error) {
      this.logDebug(`Error in Bitbucket raw button template detection: ${(error as Error).message}`);
    } finally {
      this.setRetryState(false);
    }
  }

  /**
   * Check if Bitbucket's file viewer is ready - HARDCODED DOM LOGIC
   */
  private isBitbucketFileViewerReady(): boolean {
    // Check for key Bitbucket file viewer elements
    const fileViewer = document.querySelector("[data-testid='file-actions']") ||
      document.querySelector("[data-qa='bk-file__menu']") ||
      document.querySelector('.file-header-actions') ||
      document.querySelector('.file-actions');

    // Check if we're not in a loading state
    const isLoading = document.querySelector('.loading') ||
      document.querySelector('[aria-label*="loading" i]') ||
      document.querySelector('.spinner');

    return fileViewer !== null && !isLoading;
  }

  /**
   * Find Bitbucket raw button template for cloning - HARDCODED DOM LOGIC
   */
  private findBitbucketRawButtonTemplate(): { element: HTMLElement; fileMenu: HTMLElement } | null {
    // Look for the file actions container
    const element = document.querySelector("[data-testid='file-actions']") as HTMLElement;
    if (!element || !element.hasChildNodes() || !this.checkNoPresentation(element)) {
      return null;
    }

    // Look for the file menu and action button template
    const fileMenu = document.querySelector("[data-qa='bk-file__menu']") as HTMLElement;
    const editButtonClone = document.querySelector("[data-qa='bk-file__action-button']") as HTMLElement;

    if (editButtonClone && fileMenu) {
      return { element, fileMenu };
    }

    return null;
  }

  /**
   * Extract styling from existing Bitbucket buttons dynamically - HARDCODED DOM LOGIC
   */
  private extractBitbucketButtonStyling(templateButton: HTMLElement): { classes: string; attributes: Record<string, string> } {
    // Navigate to the actual button element within the template
    const actualButton = templateButton.querySelector('button, a') ||
      (templateButton.childNodes[0]?.childNodes[0] as HTMLElement);

    if (!actualButton) {
      return { classes: '', attributes: {} };
    }

    const classes = (actualButton as HTMLElement).classList?.toString() || '';
    const attributes: Record<string, string> = {};

    // Extract common button attributes that Bitbucket uses
    const attributesToCopy = ['data-qa', 'type', 'role'];

    attributesToCopy.forEach(attr => {
      const value = (actualButton as HTMLElement).getAttribute?.(attr);
      if (value !== null) {
        attributes[attr] = value;
      }
    });

    return { classes, attributes };
  }

  /**
   * Smart button insertion for Bitbucket - HARDCODED DOM LOGIC
   */
  private insertBitbucketThreatComposerButton(template: { element: HTMLElement; fileMenu: HTMLElement }): HTMLElement {
    const { element, fileMenu } = template;
    const editButtonClone = document.querySelector("[data-qa='bk-file__action-button']") as HTMLElement;

    // Clone the template button
    const clonedElement = editButtonClone.cloneNode(true) as HTMLElement;
    const buttonElement = clonedElement.childNodes[0].childNodes[0] as HTMLElement;

    // Extract styling from the original button
    const { classes, attributes } = this.extractBitbucketButtonStyling(editButtonClone);

    // Make the button detectable by standard button detection logic
    buttonElement.id = TC_BUTTON_ID;
    buttonElement.innerText = TC_BUTTON_TEXT;
    buttonElement.style.pointerEvents = 'none';
    buttonElement.removeAttribute('href');
    (buttonElement as HTMLInputElement).disabled = true;

    // Apply extracted styling if available
    if (classes) {
      buttonElement.className = classes;
    }

    Object.entries(attributes).forEach(([key, value]) => {
      buttonElement.setAttribute(key, value);
    });

    // Add creation timestamp to prevent premature removal
    buttonElement.setAttribute('data-tc-creation-time', Date.now().toString());
    (buttonElement as any)._tcCreationTime = Date.now();

    // Insert the button before the file menu
    element.insertBefore(clonedElement, fileMenu);

    this.logDebug('Inserted Threat Composer button in Bitbucket UI with extracted styling');
    return buttonElement;
  }

  /**
   * Robust Bitbucket raw URL construction - HARDCODED DOM LOGIC
   */
  private getBitbucketRawUrl(): string {
    const cleanPath = location.pathname.replace(/^[/]|[/]$/g, '');
    const match = /^[^/]+[/][^/]+[/]?(.*)$/.exec(cleanPath);

    if (match && match[1]) {
      const rawPathSegment = match[1].replace(/^src\//, 'raw/');
      const currentUrl = window.location.href;
      return currentUrl.replace(match[1], rawPathSegment);
    }

    // Fallback: try to construct from current URL
    return window.location.href.replace('/src/', '/raw/');
  }

  /**
   * Check if element has no presentation role - HARDCODED DOM LOGIC
   */
  private checkNoPresentation(element: HTMLElement): boolean {
    if (element.tagName === 'DIV' && element.getAttribute('role') === 'presentation') {
      return false;
    }

    for (let child of element.children) {
      if (!this.checkNoPresentation(child as HTMLElement)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Cleanup for Bitbucket handler
   */
  cleanup(): void {
    // Reset state if needed
    this.state.stopProcessing = false;
  }
}

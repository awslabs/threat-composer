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
import { TCGitLabState } from '../types';
import { SPAIntegrationHandler } from './spa-handler';
import { waitForCondition, retryWithBackoff, getTCJSONCandidate, TC_BUTTON_TEXT, TC_BUTTON_ID } from '../utils/core-utils';

/**
 * GitLab integration handler with hardcoded DOM operations
 */
export class GitLabHandler extends SPAIntegrationHandler {
  constructor(config: TCConfig, state: TCGitLabState) {
    super(config, state, IntegrationTypes.GITLAB);
  }

  /**
   * Handle GitLab-specific integration logic
   */
  protected async handleIntegrationSpecific(): Promise<void> {
    if (!this.matchesFileExtension()) {
      return;
    }

    await this.handleGitLabCodeViewer();
  }

  /**
   * Handle GitLab code viewer with hardcoded DOM operations
   */
  private async handleGitLabCodeViewer(): Promise<void> {
    // Skip if already processing or retrying
    if (this.isProcessingStopped() || this.isRetrying()) {
      return;
    }

    // Wait for GitLab's file viewer to be ready
    this.logDebug('Waiting for GitLab file viewer to be ready...');
    const isReady = await waitForCondition(
      () => this.isGitLabFileViewerReady(),
      { maxWaitTime: 3000, checkInterval: 50 },
      this.config,
      'GitLab file viewer',
    );

    if (!isReady) {
      this.logDebug('GitLab file viewer not ready, will retry on next mutation');
      return;
    }

    // Set retry flag to prevent concurrent attempts
    this.setRetryState(true);

    try {
      // Use retry mechanism to find raw button
      const rawButton = await retryWithBackoff(
        () => this.findGitLabRawButton(),
        {
          maxRetries: 5,
          baseDelay: 100,
          operationName: 'GitLab raw button detection',
        },
        this.config,
      );

      if (rawButton && !this.isProcessingStopped()) {
        this.markProcessingComplete();

        this.logDebug('Successfully found GitLab raw button with retry mechanism');

        // Smart button insertion with dynamic styling
        const tcButton = this.insertGitLabThreatComposerButton(rawButton);

        // Robust URL construction
        const url = this.getGitLabRawUrl(rawButton);
        this.logDebug('Using raw URL: ' + url);

        this.logDebug('Proactively attempting to retrieve candidate');
        await getTCJSONCandidate(url, tcButton, this.config);
      } else if (!rawButton) {
        const retryCount = this.incrementRetryCount();
        this.logDebug(`Could not find GitLab raw button with any strategy (attempt ${retryCount})`);

        // If we've failed multiple times, log additional debug info
        if (retryCount >= 3) {
          this.logDebug(`GitLab DOM state - File viewer ready: ${this.isGitLabFileViewerReady()}, URL: ${window.location.href}`);
          this.logDebug(`Available buttons: ${document.querySelectorAll('a, button').length}, Raw-like elements: ${document.querySelectorAll('a[title*="raw" i], a[href*="raw"], *[class*="raw" i]').length}`);
        }
      }
    } catch (error) {
      this.logDebug(`Error in GitLab raw button detection: ${(error as Error).message}`);
    } finally {
      this.setRetryState(false);
    }
  }

  /**
   * Check if GitLab's file viewer is ready - HARDCODED DOM LOGIC
   */
  private isGitLabFileViewerReady(): boolean {
    // Check for key GitLab file viewer elements
    const fileViewer = document.querySelector('.file-holder') ||
      document.querySelector('.blob-viewer') ||
      document.querySelector('.file-content') ||
      document.querySelector('[data-testid="blob-viewer"]');

    // Check if we're not in a loading state
    const isLoading = document.querySelector('.gl-spinner') ||
      document.querySelector('.loading') ||
      document.querySelector('[aria-label*="loading" i]');

    return fileViewer !== null && !isLoading;
  }

  /**
   * Multi-strategy GitLab raw button detection - HARDCODED DOM LOGIC
   */
  private findGitLabRawButton(): HTMLElement | null {
    // Strategy 1: title attribute (most common)
    let rawButton = document.querySelector("a[title='Open raw']");
    if (rawButton) return rawButton as HTMLElement;

    // Strategy 2: href pattern matching
    rawButton = document.querySelector('a[href*="/-/raw/"]');
    if (rawButton) return rawButton as HTMLElement;

    // Strategy 3: text content matching
    const buttons = document.querySelectorAll('a, button');
    for (const button of buttons) {
      if (button.textContent?.trim().toLowerCase() === 'raw') {
        return button as HTMLElement;
      }
    }

    // Strategy 4: class-based fallback
    rawButton = document.querySelector('.btn[href*="raw"]');
    if (rawButton) return rawButton as HTMLElement;

    return null;
  }

  /**
   * Extract styling from existing GitLab buttons dynamically - HARDCODED DOM LOGIC
   */
  private extractGitLabButtonStyling(rawButton: HTMLElement): { classes: string; attributes: Record<string, string> } {
    const classes = rawButton.classList.toString();
    const attributes: Record<string, string> = {};

    // Extract common button attributes that GitLab uses
    const attributesToCopy = ['data-toggle', 'data-placement', 'rel'];

    attributesToCopy.forEach(attr => {
      const value = rawButton.getAttribute(attr);
      if (value !== null) {
        attributes[attr] = value;
      }
    });

    return { classes, attributes };
  }

  /**
   * Smart button insertion for GitLab - HARDCODED DOM LOGIC
   */
  private insertGitLabThreatComposerButton(rawButton: HTMLElement): HTMLElement {
    const tcButton = document.createElement('a');
    tcButton.id = TC_BUTTON_ID;

    // Extract actual styling from the raw button
    let { classes, attributes } = this.extractGitLabButtonStyling(rawButton);

    //Customize classes
    classes = classes.replace('btn-icon', '');

    // Apply the extracted classes and attributes
    tcButton.setAttribute('class', classes);
    tcButton.innerText = TC_BUTTON_TEXT;
    tcButton.style.pointerEvents = 'none';

    Object.entries(attributes).forEach(([key, value]) => {
      tcButton.setAttribute(key, value);
    });

    // Find the button group container
    const buttonGroup = rawButton.closest('.file-actions') ||
      rawButton.closest('.btn-group') ||
      rawButton.parentElement;

    if (buttonGroup && rawButton.parentNode) {
      // Insert before the raw button to maintain order
      rawButton.parentNode.insertBefore(tcButton, rawButton);
      this.logDebug('Inserted Threat Composer button in GitLab UI button group with extracted styling');
    } else if (rawButton.parentNode) {
      // Fallback: insert before raw button directly
      rawButton.parentNode.insertBefore(tcButton, rawButton);
      this.logDebug('Inserted Threat Composer button using fallback method with extracted styling');
    }

    return tcButton;
  }

  /**
   * Robust GitLab raw URL construction - HARDCODED DOM LOGIC
   */
  private getGitLabRawUrl(rawButton: HTMLElement): string {
    // Try to get URL from raw button href
    const href = rawButton.getAttribute('href');
    if (href && href.includes('/-/raw/')) {
      const fullUrl = new URL(href, window.location.origin).toString();
      return fullUrl;
    }

    // Fallback: construct from current URL
    return location.href.replace(/\/\-\/blob/, '/-/raw');
  }
}

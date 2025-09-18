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
import { TCGitHubState } from '../types';
import { SPAIntegrationHandler } from './spa-handler';
import { waitForCondition, retryWithBackoff, getTCJSONCandidate, createTCButton } from '../utils/core-utils';

/**
 * GitHub integration handler with hardcoded DOM operations
 */
export class GitHubHandler extends SPAIntegrationHandler {
  constructor(config: TCConfig, state: TCGitHubState) {
    super(config, state, IntegrationTypes.GITHUB);
  }

  /**
   * Handle GitHub-specific integration logic
   */
  protected async handleIntegrationSpecific(): Promise<void> {
    if (!this.matchesFileExtension()) {
      return;
    }

    await this.handleGitHubCodeViewer();
  }

  /**
   * Handle GitHub code viewer with hardcoded DOM operations
   */
  private async handleGitHubCodeViewer(): Promise<void> {
    // Skip if already processing or retrying
    if (this.isProcessingStopped() || this.isRetrying()) {
      return;
    }

    // Wait for GitHub's file viewer to be ready
    this.logDebug('Waiting for GitHub file viewer to be ready...');
    const isReady = await waitForCondition(
      () => this.isGitHubFileViewerReady(),
      { maxWaitTime: 3000, checkInterval: 50 },
      this.config,
      'GitHub file viewer',
    );

    if (!isReady) {
      this.logDebug('GitHub file viewer not ready, will retry on next mutation');
      return;
    }

    // Set retry flag to prevent concurrent attempts
    this.setRetryState(true);

    try {
      // Use retry mechanism to find raw button
      const rawButton = await retryWithBackoff(
        () => this.findGitHubRawButton(),
        {
          maxRetries: 5,
          baseDelay: 100,
          operationName: 'GitHub raw button detection',
        },
        this.config,
      );

      if (rawButton && !this.isProcessingStopped()) {
        this.markProcessingComplete();

        this.logDebug('Successfully found GitHub raw button with retry mechanism');

        // Smart button insertion with dynamic styling
        const tcButton = this.insertThreatComposerButton(rawButton);

        // Robust URL construction
        const url = this.getRawUrl(rawButton);
        this.logDebug('Using raw URL: ' + url);

        this.logDebug('Proactively attempting to retrieve candidate');
        await getTCJSONCandidate(url, tcButton, this.config);
      } else if (!rawButton) {
        const retryCount = this.incrementRetryCount();
        this.logDebug(`Could not find GitHub raw button with any strategy (attempt ${retryCount})`);

        // If we've failed multiple times, log additional debug info
        if (retryCount >= 3) {
          this.logDebug(`GitHub DOM state - File viewer ready: ${this.isGitHubFileViewerReady()}, URL: ${window.location.href}`);
          this.logDebug(`Available buttons: ${document.querySelectorAll('a, button').length}, Raw-like elements: ${document.querySelectorAll('[data-testid*="raw"], a[href*="/raw/"], *[aria-label*="raw" i]').length}`);
        }
      }
    } catch (error) {
      this.logDebug(`Error in GitHub raw button detection: ${(error as Error).message}`);
    } finally {
      this.setRetryState(false);
    }
  }

  /**
   * Check if GitHub's file viewer is ready - HARDCODED DOM LOGIC
   */
  private isGitHubFileViewerReady(): boolean {
    // Check for key GitHub file viewer elements
    const fileViewer = document.querySelector('[data-testid="repos-file-viewer"]') ||
      document.querySelector('.repository-content') ||
      document.querySelector('.file-navigation') ||
      document.querySelector('.Box-header');

    // Check if we're not in a loading state
    const isLoading = document.querySelector('[data-testid="page-loader"]') ||
      document.querySelector('.loading') ||
      document.querySelector('[aria-label="Loading content"]');

    return fileViewer !== null && !isLoading;
  }

  /**
   * Multi-strategy GitHub raw button detection - HARDCODED DOM LOGIC
   */
  private findGitHubRawButton(): HTMLElement | null {
    // Strategy 1: data-testid (most reliable for new GitHub UI)
    let rawButton = document.querySelector('[data-testid="raw-button"]');
    if (rawButton) return rawButton as HTMLElement;

    // Strategy 2: href pattern matching
    rawButton = document.querySelector('a[href*="/raw/"]');
    if (rawButton) return rawButton as HTMLElement;

    // Strategy 3: text content matching
    const buttons = document.querySelectorAll('a, button');
    for (const button of buttons) {
      if (button.textContent?.trim().toLowerCase() === 'raw') {
        return button as HTMLElement;
      }
    }

    // Strategy 4: aria-label fallback (old GitHub UI)
    return document.querySelector('[aria-label="Copy raw content"]') as HTMLElement;
  }

  /**
   * Extract styling from existing GitHub buttons dynamically - HARDCODED DOM LOGIC
   */
  private extractGitHubButtonStyling(rawButton: HTMLElement): { classes: string; attributes: Record<string, string> } {
    const classes = rawButton.classList.toString();
    const attributes: Record<string, string> = {};

    // Extract common button attributes that GitHub uses
    const attributesToCopy = ['data-size', 'data-variant', 'data-loading', 'data-no-visuals'];

    attributesToCopy.forEach(attr => {
      const value = rawButton.getAttribute(attr);
      if (value !== null) {
        attributes[attr] = value;
      }
    });

    return { classes, attributes };
  }

  /**
   * Smart button group detection and insertion - HARDCODED DOM LOGIC
   */
  private insertThreatComposerButton(rawButton: HTMLElement): HTMLElement {
    const tcButton = createTCButton();

    // Extract actual styling from the raw button
    const { classes, attributes } = this.extractGitHubButtonStyling(rawButton);

    // Apply the extracted classes and attributes
    tcButton.setAttribute('type', 'button');
    tcButton.setAttribute('class', classes);

    Object.entries(attributes).forEach(([key, value]) => {
      tcButton.setAttribute(key, value);
    });

    // Find the button group container (new GitHub UI)
    const buttonGroup = rawButton.closest('.prc-ButtonGroup-ButtonGroup-vcMeG') ||
      rawButton.closest('[class*="ButtonGroup"]') ||
      rawButton.closest('[class*="BlobHeader"]') ||
      rawButton.parentElement;

    if (buttonGroup) {
      // Insert after the raw button's container for new UI
      const rawContainer = rawButton.closest('div') || rawButton;
      const tcContainer = document.createElement('div');

      // Copy container styling if it exists
      const containerClasses = rawContainer.classList.toString();
      if (containerClasses) {
        tcContainer.setAttribute('class', containerClasses);
      }

      tcContainer.appendChild(tcButton);
      rawContainer.after(tcContainer);

      this.logDebug('Inserted Threat Composer button in GitHub UI button group with extracted styling');
    } else {
      // Fallback: insert after raw button directly (old UI)
      rawButton.after(tcButton);

      this.logDebug('Inserted Threat Composer button using fallback method with extracted styling');
    }

    return tcButton;
  }

  /**
   * Robust URL extraction - HARDCODED DOM LOGIC
   */
  private getRawUrl(rawButton: HTMLElement): string {
    // Try to get URL from raw button href
    const href = rawButton.getAttribute('href');
    if (href && href.includes('/raw/')) {
      const fullUrl = new URL(href, window.location.origin).toString();
      return fullUrl;
    }

    // Fallback to current approach
    return window.location + '?raw=1';
  }
}

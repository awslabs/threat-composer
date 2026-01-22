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

import { TCConfig } from '../../popup/config';
import { SPAIntegrationState } from '../types';
import { BaseIntegrationHandler } from './base-handler';
import {
  shouldSkipProcessing,
  handleSPANavigation,
  handleSameFileNavigation,
  setSPARetryState,
  markSPAProcessingComplete,
} from '../utils/spa-utils';

/**
 * Base class for SPA-based integration handlers (GitHub, GitLab, CodeCatalyst)
 */
export abstract class SPAIntegrationHandler extends BaseIntegrationHandler {
  protected state: SPAIntegrationState;

  constructor(config: TCConfig, state: SPAIntegrationState, integrationType: string) {
    super(config, state, integrationType);
    this.state = state;
  }

  /**
   * Main handler for SPA integrations
   */
  async handle(): Promise<void> {
    if (!this.isIntegrationActive()) {
      return;
    }

    // Handle SPA navigation first
    const navigationOccurred = handleSPANavigation(this.state, this.config, this.integrationType);

    // Handle same-file navigation
    const regExCheck = new RegExp(this.config.fileExtension);
    handleSameFileNavigation(this.state, this.config, regExCheck);

    // Skip processing if appropriate
    if (shouldSkipProcessing(this.state, this.config)) {
      return;
    }

    // Handle raw file if applicable
    if (await this.handleRawFileIfApplicable()) {
      return;
    }

    // Handle integration-specific processing
    await this.handleIntegrationSpecific();
  }

  /**
   * Override shouldSkipProcessing to use SPA-specific logic
   */
  protected shouldSkipProcessing(): boolean {
    return shouldSkipProcessing(this.state, this.config);
  }

  /**
   * Set retry state for SPA processing
   */
  protected setRetryState(isRetrying: boolean): void {
    setSPARetryState(this.state, isRetrying);
  }

  /**
   * Mark processing as complete
   */
  protected markProcessingComplete(): void {
    markSPAProcessingComplete(this.state);
  }

  /**
   * Check if currently retrying
   */
  protected isRetrying(): boolean {
    return this.state.isRetrying;
  }

  /**
   * Check if processing is stopped
   */
  protected isProcessingStopped(): boolean {
    return this.state.stopProcessing;
  }

  /**
   * Get current retry count
   */
  protected getRetryCount(): number {
    return this.state.retryCount;
  }

  /**
   * Increment retry count
   */
  protected incrementRetryCount(): number {
    this.state.retryCount++;
    return this.state.retryCount;
  }

  /**
   * Default cleanup implementation for SPA handlers
   */
  cleanup(): void {
    // Reset state if needed
    this.state.isRetrying = false;
  }
}

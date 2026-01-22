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
import { BaseIntegrationState, IntegrationHandler } from '../types';
import { matchesAnyRegex, threatComposerButtonExists } from '../utils/core-utils';
import { isActualRawSite, handleRaw } from '../utils/raw-file-utils';

/**
 * Base class for all integration handlers
 */
export abstract class BaseIntegrationHandler implements IntegrationHandler {
  protected config: TCConfig;
  protected state: BaseIntegrationState;
  protected integrationType: string;

  constructor(config: TCConfig, state: BaseIntegrationState, integrationType: string) {
    this.config = config;
    this.state = state;
    this.integrationType = integrationType;
  }

  /**
   * Check if this integration is enabled and matches current URL
   */
  protected isIntegrationActive(): boolean {
    const integration = this.config.integrations[this.integrationType];
    if (!integration || !integration.enabled) {
      return false;
    }

    return matchesAnyRegex(window.location.href, integration.urlRegexes);
  }

  /**
   * Check if current URL matches file extension pattern
   */
  protected matchesFileExtension(): boolean {
    const regExCheck = new RegExp(this.config.fileExtension);
    return window.location.href.match(regExCheck) !== null;
  }

  /**
   * Check if we should skip processing (basic version for non-SPA integrations)
   */
  protected shouldSkipProcessing(): boolean {
    return threatComposerButtonExists() || this.state.stopProcessing;
  }

  /**
   * Handle raw file if applicable
   */
  protected async handleRawFileIfApplicable(): Promise<boolean> {
    if (isActualRawSite(this.config, this.integrationType) && this.matchesFileExtension()) {
      await handleRaw(this.config);
      return true;
    }
    return false;
  }

  /**
   * Log integration-specific debug message
   */
  protected logDebug(message: string): void {
    logDebugMessage(this.config, `[${this.integrationType}] ${message}`);
  }

  /**
   * Abstract methods that must be implemented by concrete handlers
   */
  abstract handle(): Promise<void>;
  abstract cleanup(): void;

  /**
   * Abstract method for integration-specific processing
   */
  protected abstract handleIntegrationSpecific(): Promise<void>;
}

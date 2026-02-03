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
import { TCAmazonCodeState } from '../types';
import { BaseIntegrationHandler } from './base-handler';
import { getTCJSONCandidate, TC_BUTTON_TEXT, TC_BUTTON_ID } from '../utils/core-utils';

/**
 * Amazon Code integration handler with hardcoded DOM operations
 */
export class AmazonCodeHandler extends BaseIntegrationHandler {
  constructor(config: TCConfig, state: TCAmazonCodeState) {
    super(config, state, IntegrationTypes.CODEAMAZON);
  }

  /**
   * Handle Amazon Code integration
   */
  async handle(): Promise<void> {
    if (!this.isIntegrationActive()) {
      return;
    }

    if (this.shouldSkipProcessing()) {
      return;
    }

    // Early exit if not a .tc.json file - this prevents unnecessary processing
    if (!this.matchesFileExtension()) {
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
   * Handle Amazon Code-specific integration logic with hardcoded DOM operations
   */
  protected async handleIntegrationSpecific(): Promise<void> {
    // Try site-specific logic first - only fall back to raw handling if site-specific fails
    const element = document.getElementsByClassName('file_header');
    if (element && element.length > 0 && !this.state.stopProcessing) {
      this.state.stopProcessing = true;
      const fileActionsDiv = document.getElementById('file_actions');
      if (fileActionsDiv) {
        const fileActionsButtonGroups = fileActionsDiv.getElementsByClassName('button_group');
        if (fileActionsButtonGroups.length > 0) {
          const fileActionsButtonGroup = fileActionsButtonGroups[0];
          const tcListItem = document.createElement('li');
          const tcButton = document.createElement('a');
          tcButton.textContent = TC_BUTTON_TEXT;
          tcButton.id = TC_BUTTON_ID;
          tcButton.setAttribute('class', 'minibutton');
          tcButton.textContent = TC_BUTTON_TEXT;
          tcButton.style.pointerEvents = 'none';
          tcListItem.appendChild(tcButton);
          fileActionsButtonGroup.appendChild(tcListItem);
          this.logDebug('Proactively attempting to retrieve candidate');
          const url = window.location + '?raw=1';
          await getTCJSONCandidate(url, tcButton, this.config);
        }
      }
    }
  }

  /**
   * Cleanup for Amazon Code handler
   */
  cleanup(): void {
    // Reset state if needed
    this.state.stopProcessing = false;
  }
}

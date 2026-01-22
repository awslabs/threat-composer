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

import { createTCButton, extractContentDirectly, processTCCandidate, getTCJSONCandidate } from './core-utils';
import { logDebugMessage } from '../../../debugLogger';
import { TCConfig, IntegrationTypes } from '../../popup/config';

/**
 * Check if current page is a raw site (has <pre> tag)
 */
export function isRawSite(tcConfig: TCConfig): boolean {
  if (document.getElementsByTagName('pre')[0]) {
    logDebugMessage(tcConfig, 'Appears to be a raw site due to <pre> tag being present');
    return true;
  }
  return false;
}

/**
 * Check if current page is actually a raw site for the given integration type
 */
export function isActualRawSite(tcConfig: TCConfig, integrationType: string): boolean {
  // First check if there's a <pre> tag (existing logic)
  if (!isRawSite(tcConfig)) {
    return false;
  }

  // Then check if URL matches any raw patterns for this integration
  const integration = tcConfig.integrations[integrationType];
  if (!integration || !integration.rawUrlPatterns || integration.rawUrlPatterns.length === 0) {
    return false;
  }

  const currentUrl = window.location.href;
  const hasRawPattern = integration.rawUrlPatterns.some(pattern =>
    currentUrl.includes(pattern),
  );

  if (hasRawPattern) {
    logDebugMessage(tcConfig, `Confirmed as actual raw site for ${integrationType} - URL contains raw pattern`);
  } else {
    logDebugMessage(tcConfig, `Not a raw site for ${integrationType} - URL does not contain any raw patterns`);
  }

  return hasRawPattern;
}

/**
 * Handle raw file processing - tries direct DOM extraction first, then background fetch
 */
export async function handleRawFile(config: TCConfig): Promise<void> {
  const element = document.getElementsByTagName('pre');
  const tcButton = createTCButton();
  if (element) {
    document.body.prepend(tcButton);
    window.scrollTo(0, 0); //Scroll to top
  }

  logDebugMessage(config, 'Attempting to extract content from raw file');

  // Try direct DOM extraction first (works in sandboxed environments)
  try {
    const content = await extractContentDirectly(config);
    if (content) {
      logDebugMessage(config, 'Successfully extracted content directly from DOM');
      await processTCCandidate(content, tcButton, config);
      return;
    }
  } catch (error) {
    logDebugMessage(config, 'Direct extraction failed: ' + (error as Error).message);
  }

  // Fallback to background fetch if direct extraction fails
  logDebugMessage(config, 'Falling back to background fetch');
  const url = window.location.toString();
  await getTCJSONCandidate(url, tcButton, config);
}

/**
 * Main raw file handler - wrapper around handleRawFile for consistency
 */
export async function handleRaw(tcConfig: TCConfig): Promise<void> {
  await handleRawFile(tcConfig);
}

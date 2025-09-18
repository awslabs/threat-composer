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

import { logDebugMessage } from '../debugLogger';
import { AmazonCodeHandler } from './content-script/handlers/amazon-code-handler';
import { BaseIntegrationHandler } from './content-script/handlers/base-handler';
import { BitbucketHandler } from './content-script/handlers/bitbucket-handler';
import { CodeCatalystHandler } from './content-script/handlers/codecatalyst-handler';
import { GitHubHandler } from './content-script/handlers/github-handler';
import { GitLabHandler } from './content-script/handlers/gitlab-handler';
import { SPAIntegrationHandler } from './content-script/handlers/spa-handler';
import {
  TCGitHubState,
  TCGitLabState,
  TCCodeCatalystState,
  TCAmazonCodeState,
  TCBitbucketState,
} from './content-script/types';
import { getExtensionConfig, TCConfig, IntegrationTypes } from './popup/config';

// WXT framework imports
declare const defineContentScript: any;
declare const browser: any;

/**
 * Main content script orchestrator that manages all integration handlers
 * and coordinates the overall execution flow while maintaining the exact
 * same functionality as the original monolithic script.
 */
class ContentScriptOrchestrator {
  private config: TCConfig;
  private handlers: Map<string, BaseIntegrationHandler> = new Map();
  private observers: Map<string, MutationObserver> = new Map();
  private states: Map<string, any> = new Map();
  private readonly DEBOUNCE_DELAY = 100; // ms

  constructor(config: TCConfig) {
    this.config = config;
    this.initializeStates();
    this.initializeHandlers();
  }

  /**
   * Initialize state objects for all integrations
   */
  private initializeStates(): void {
    // SPA integrations need navigation state - initialize previousUrl to empty string
    // to ensure first navigation is detected (matches original working behavior)
    this.states.set(IntegrationTypes.GITHUB, {
      stopProcessing: false,
      previousUrl: '',
      retryCount: 0,
      isRetrying: false,
    } as TCGitHubState);

    this.states.set(IntegrationTypes.GITLAB, {
      stopProcessing: false,
      previousUrl: '',
      retryCount: 0,
      isRetrying: false,
    } as TCGitLabState);

    this.states.set(IntegrationTypes.CODECATALYST, {
      stopProcessing: false,
      previousUrl: '',
      retryCount: 0,
      isRetrying: false,
    } as TCCodeCatalystState);

    // Non-SPA integrations need basic state
    this.states.set(IntegrationTypes.CODEAMAZON, {
      stopProcessing: false,
    } as TCAmazonCodeState);

    this.states.set(IntegrationTypes.BITBUCKET, {
      stopProcessing: false,
    } as TCBitbucketState);
  }

  /**
   * Initialize all integration handlers based on enabled configurations
   */
  private initializeHandlers(): void {
    if (this.config.integrations[IntegrationTypes.GITHUB].enabled) {
      const githubState = this.states.get(IntegrationTypes.GITHUB) as TCGitHubState;
      this.handlers.set(IntegrationTypes.GITHUB, new GitHubHandler(this.config, githubState));
    }

    if (this.config.integrations[IntegrationTypes.GITLAB].enabled) {
      const gitlabState = this.states.get(IntegrationTypes.GITLAB) as TCGitLabState;
      this.handlers.set(IntegrationTypes.GITLAB, new GitLabHandler(this.config, gitlabState));
    }

    if (this.config.integrations[IntegrationTypes.CODECATALYST].enabled) {
      const codecatalystState = this.states.get(IntegrationTypes.CODECATALYST) as TCCodeCatalystState;
      this.handlers.set(IntegrationTypes.CODECATALYST, new CodeCatalystHandler(this.config, codecatalystState));
    }

    if (this.config.integrations[IntegrationTypes.CODEAMAZON].enabled) {
      const amazonCodeState = this.states.get(IntegrationTypes.CODEAMAZON) as TCAmazonCodeState;
      this.handlers.set(IntegrationTypes.CODEAMAZON, new AmazonCodeHandler(this.config, amazonCodeState));
    }

    if (this.config.integrations[IntegrationTypes.BITBUCKET].enabled) {
      const bitbucketState = this.states.get(IntegrationTypes.BITBUCKET) as TCBitbucketState;
      this.handlers.set(IntegrationTypes.BITBUCKET, new BitbucketHandler(this.config, bitbucketState));
    }
  }

  /**
   * Check if the current URL is in scope for any enabled integration
   */
  private async isInScope(): Promise<boolean> {
    const inScopeRegexes: string[] = [];

    // Collect all enabled integration regexes
    Object.values(IntegrationTypes).forEach(integrationType => {
      const integration = this.config.integrations[integrationType];
      if (integration?.enabled && integration.urlRegexes) {
        inScopeRegexes.push(...integration.urlRegexes);
      }
    });

    // Check if current URL matches any regex
    const currentUrl = window.location.href;
    const match = inScopeRegexes.some(regex => {
      const isMatch = new RegExp(regex).test(currentUrl);
      if (isMatch) {
        logDebugMessage(this.config, `Got a URL match for regex entry: ${regex}`);
      }
      return isMatch;
    });

    return match;
  }

  /**
   * Determine which integration type matches the current site
   */
  private getMatchingIntegrationType(): string | null {
    const currentUrl = window.location.href;

    // Check each enabled integration in priority order
    const integrationTypes = [
      IntegrationTypes.GITLAB,
      IntegrationTypes.GITHUB,
      IntegrationTypes.CODECATALYST,
      IntegrationTypes.CODEAMAZON,
      IntegrationTypes.BITBUCKET,
    ];

    for (const integrationType of integrationTypes) {
      const integration = this.config.integrations[integrationType];
      if (integration?.enabled && integration.urlRegexes) {
        const matches = integration.urlRegexes.some(regex =>
          new RegExp(regex).test(currentUrl),
        );
        if (matches) {
          return integrationType;
        }
      }
    }

    return null;
  }

  /**
   * Set up mutation observer for the specified integration with debouncing
   */
  private setupMutationObserver(integrationType: string, handler: BaseIntegrationHandler): void {
    const observerConfig = {
      childList: true,
      subtree: true,
    };

    // Determine the observation scope based on integration type
    let observationTarget: Node;
    if (handler instanceof SPAIntegrationHandler) {
      // SPAs need document-level observation
      logDebugMessage(this.config, 'Setting document level observation target for SPA');
      observationTarget = document;
    } else {
      // Non-SPAs can use document.body
      logDebugMessage(this.config, 'Setting document.body level observation target for non-SPA');
      observationTarget = document.body;
    }

    // Debounced handler to prevent rapid-fire processing
    const debouncedHandler = this.debounce(() => {
      handler.handle().catch((error: Error) => {
        logDebugMessage(this.config, `Error in ${integrationType} handler: ${error.message}`);
      });
    }, this.DEBOUNCE_DELAY);

    const observer = new MutationObserver(() => {
      debouncedHandler();
    });

    observer.observe(observationTarget, observerConfig);
    this.observers.set(integrationType, observer);

    logDebugMessage(this.config, `Set up mutation observer for ${integrationType} with ${this.DEBOUNCE_DELAY}ms debouncing`);
  }

  /**
   * Debounce utility to prevent rapid-fire execution
   */
  private debounce(func: Function, delay: number): Function {
    let timeoutId: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
  }

  /**
   * Inject required scripts for specific integrations
   */
  private injectRequiredScripts(integrationType: string): void {
    if (integrationType === IntegrationTypes.CODECATALYST) {
      // CodeCatalyst requires script injection for raw content access
      const script = document.createElement('script');
      script.src = browser.runtime.getURL('scriptInjectForCodeCatalyst.js');
      script.onload = function () {
        (this as HTMLScriptElement).remove();
      };
      (document.head || document.documentElement).appendChild(script);

      logDebugMessage(this.config, 'Injected CodeCatalyst script');
    }
  }

  /**
   * Main execution method that orchestrates the entire content script flow
   */
  async execute(): Promise<void> {
    try {
      // Check if we're in scope for any integration
      if (!await this.isInScope()) {
        logDebugMessage(this.config, 'Aborting execution. URL not in scope of any regexes');
        return;
      }

      logDebugMessage(this.config, 'Continuing content script execution. URL IS in scope of at least one regex');

      // Determine which integration matches the current site
      const matchingIntegrationType = this.getMatchingIntegrationType();
      if (!matchingIntegrationType) {
        logDebugMessage(this.config, 'No matching integration type found');
        return;
      }

      const handler = this.handlers.get(matchingIntegrationType);
      if (!handler) {
        logDebugMessage(this.config, `No handler found for integration type: ${matchingIntegrationType}`);
        return;
      }

      logDebugMessage(this.config, `Assuming ${matchingIntegrationType}...`);

      // Inject required scripts for this integration
      this.injectRequiredScripts(matchingIntegrationType);

      // Perform initial handling
      await handler.handle();

      // Set up mutation observer for ongoing monitoring
      this.setupMutationObserver(matchingIntegrationType, handler);

    } catch (error) {
      logDebugMessage(this.config, `Error in content script execution: ${(error as Error).message}`);
    }
  }

  /**
   * Clean up resources when the content script is unloaded
   */
  cleanup(): void {
    // Disconnect all mutation observers
    this.observers.forEach((observer, integrationType) => {
      observer.disconnect();
      logDebugMessage(this.config, `Disconnected mutation observer for ${integrationType}`);
    });

    this.observers.clear();
    this.handlers.clear();
  }
}

/**
 * WXT content script definition - maintains the same structure as the original
 */
export default defineContentScript({
  async main() {
    try {
      // Get extension configuration
      const tcConfig = await getExtensionConfig();

      // Create and execute the orchestrator
      const orchestrator = new ContentScriptOrchestrator(tcConfig);
      await orchestrator.execute();

      // Set up cleanup on page unload
      window.addEventListener('beforeunload', () => {
        orchestrator.cleanup();
      });

    } catch (error) {
      console.error('ThreatComposer Extension: Failed to initialize content script:', error);
    }
  },
});

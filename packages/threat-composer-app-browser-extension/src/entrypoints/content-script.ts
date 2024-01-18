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

import { getExtensionConfig, TCConfig } from './popup/config';
import { logDebugMessage } from '../debugLogger';
interface TCJSONSimplifiedSchema {
  schema?: string;
}

interface TCGitHubState {
  previousUrl: string;
  stopProcessing: boolean;
}

interface TCCodeCatalystState {
  stopProcessing: boolean;
}

interface TCCodeBrowserState {
  stopProcessing: boolean;
}


function isLikelyThreatComposerSchema(JSONobj: TCJSONSimplifiedSchema) {
  return JSONobj.schema ? true : false;
};

async function getTCJSONCandidate(url: string, element: HTMLElement, config: TCConfig) {
  const tcJSONCandidate: TCJSONSimplifiedSchema = await fetch(url)
    .then(function (response) {
      logDebugMessage(config, 'Able to get a JSON candidate');
      return response.json();
    })
    .catch(function (error) {
      logDebugMessage(config, 'Error during fetch: ' + error.message);
    });

  if (tcJSONCandidate && isLikelyThreatComposerSchema(tcJSONCandidate)) {
    logDebugMessage(config,
      'Looks like it could be a Threat Composer file, enabling ' +
      element.textContent +
      ' button',
    );
    element.onclick = function () {
      logDebugMessage(config,
        'Sending message with candicate JSON object back service worker / background script',
      );
      browser.runtime.sendMessage(tcJSONCandidate);
    };

    switch (element.tagName) { //"Enable" button / anchor
      case 'BUTTON':
        (element as HTMLInputElement).disabled = false;
        break;
      case 'A': //Anchor
        element.style.pointerEvents = 'auto';
        break;
    }

  } else {
    logDebugMessage(config,
      "Does NOT look like it's a Threat Composer file, NOT enabling " +
      element.textContent +
      ' button',
    );
  }
};

async function handleRawFile(config: TCConfig) {
  const element = document.getElementsByTagName('pre');
  const tcButton = createTCButton();
  if (element) {
    document.body.prepend(tcButton);
    window.scrollTo(0, 0); //Scroll to top
  }
  logDebugMessage(config, 'Proactively attempting to retrieve candidate');
  const url = window.location.toString();
  await getTCJSONCandidate(url, tcButton, config);
};

function createTCButton() {
  const tcButton = document.createElement('button');
  tcButton.textContent = 'View in Threat Composer';
  tcButton.disabled = true;
  return tcButton;
}

async function handleGitHubCodeViewer(gitHubState: TCGitHubState, config: TCConfig) {
  var regExCheck = new RegExp(config.fileExtension);
  if (window.location.href.match(regExCheck)) {
    let element = document.querySelector('[aria-label="Copy raw content"]');
    if (window.location.href != gitHubState.previousUrl) {
      //Handle GitHub being a SPA
      gitHubState.previousUrl = window.location.href;
      gitHubState.stopProcessing = false;
    }
    if (element && !gitHubState.stopProcessing) {
      gitHubState.stopProcessing = true;
      const rawButton = document.querySelector('[aria-label="Copy raw content"]');
      const tcButton = createTCButton();
      tcButton.setAttribute('type', 'button');
      tcButton.setAttribute('class', rawButton?.classList.toString());
      tcButton.setAttribute('data-size', 'small');
      rawButton?.before(tcButton);
      logDebugMessage(config, 'Proactively attempting to retrieve candidate');
      const url = window.location + '?raw=1';
      await getTCJSONCandidate(url, tcButton, config);
    }
  }
};

async function handleAmazonCodeBrowser(codeBrowserState: TCCodeBrowserState, config: TCConfig) {
  const element = document.getElementsByClassName('cs-Tabs__tab-header-actions');
  if (element && !codeBrowserState.stopProcessing) {
    codeBrowserState.stopProcessing = true;
    const fileActionsDiv = document.getElementById('file_actions');
    if (fileActionsDiv) {
      const fileActionsButtonGroup = fileActionsDiv.getElementsByClassName('button_group')[0];
      const tcListItem = document.createElement('li');
      const tcAnchor = document.createElement('a');
      tcAnchor.setAttribute('class', 'minibutton');
      tcAnchor.textContent = 'View in Threat Composer';
      tcAnchor.style.pointerEvents = 'none';
      tcListItem.appendChild(tcAnchor);
      fileActionsButtonGroup.appendChild(tcListItem);
      logDebugMessage(config, 'Proactively attempting to retrieve candidate');
      const url = window.location + '?raw=1';
      await getTCJSONCandidate(url, tcAnchor, config);
    }
  }
};

async function handleCodeCatalystCodeViewer(codeCatalystState: TCCodeCatalystState, config: TCConfig) {
  const element = document.getElementsByClassName(
    'cs-Tabs__tab-header-actions',
  )[0];
  if (element && element.hasChildNodes() && !codeCatalystState.stopProcessing) {
    codeCatalystState.stopProcessing = true;
    const tcAnchor = document.createElement('a');
    const currentAnchor = element.firstChild;
    tcAnchor.setAttribute(
      'class',
      currentAnchor?.classList.toString(),
    );

    const currentSpan = currentAnchor?.firstChild;

    const tcSpan = document.createElement('span');
    tcSpan.setAttribute('class', currentSpan.classList.toString());
    tcSpan.textContent = 'View in Threat Composer';

    tcAnchor.appendChild(tcSpan);

    tcAnchor.onclick = function () {
      if (document.getElementById('raw-div')) {
        const rawText = document.getElementById('raw-div')!.textContent;
        if (rawText) {
          const jsonObj: TCJSONSimplifiedSchema = JSON.parse(rawText);
          logDebugMessage(config,
            'Sending message with candicate JSON object back service worker / background script',
          );
          browser.runtime.sendMessage(jsonObj);
        }
      }
    };

    const actionsDiv = document.getElementsByClassName(
      'cs-Tabs__tab-header-actions',
    )[0];
    actionsDiv.appendChild(tcAnchor);
  }
};

export default defineContentScript({
  main() {
    const gitHubState: TCGitHubState = {
      previousUrl: '',
      stopProcessing: false,
    };

    const codeBrowserState: TCCodeBrowserState = {
      stopProcessing: false,
    };

    const codeCatalystState: TCCodeCatalystState = {
      stopProcessing: false,
    };

    void (async function () {

      const tcConfig = await getExtensionConfig();

      const config = {
        childList: true,
        subtree: true,
      };

      if (
        tcConfig.integrationRaw &&
        (window.location.href.match(/raw.githubusercontent.com/) ||
          window.location.href.match(/raw=1/))
      ) {
        logDebugMessage(tcConfig, 'Based on URL or parameters, assuming raw file view');
        await handleRawFile(tcConfig);
      } else if (
        tcConfig.integrationGitHubCodeBrowser &&
        window.location.href.match(/github.com/)
      ) {
        logDebugMessage(tcConfig,
          'URL is GitHub.com - Setting up mutation observer scoped to *://*.github.com/*' +
          tcConfig.fileExtension +
          '*',
        );
        await handleGitHubCodeViewer(gitHubState, tcConfig);
        let observerForGitHubCodeViewer = new MutationObserver(
          () => handleGitHubCodeViewer(gitHubState, tcConfig),
        );
        observerForGitHubCodeViewer.observe(document, config);
      } else if (
        tcConfig.integrationCodeCatalystCodeBrowser &&
        window.location.href.match(/codecatalyst.aws/)
      ) {
        logDebugMessage(tcConfig, 'URL is codecatalyst.aws - Assuming code viewer');
        //Inject script
        const s = document.createElement('script');
        s.src = browser.runtime.getURL('scriptInjectForCodeCatalyst.js');
        s.onload = function () {
          this.remove();
        };
        (document.head || document.documentElement).appendChild(s);
        let observerForCodeCatalystCodeViewer = new MutationObserver(
          () => handleCodeCatalystCodeViewer(codeCatalystState, tcConfig),
        );
        observerForCodeCatalystCodeViewer.observe(document.body, config);
      } else if (
        tcConfig.integrationAmazonCodeBrowser &&
        window.location.href.match(/code.amazon.com/)
      ) {
        logDebugMessage(tcConfig, 'URL is code.amazon.com - Assuming code browser');
        await handleAmazonCodeBrowser(codeBrowserState, tcConfig);
        let observerForAmazonCodeBrowser = new MutationObserver(
          () => handleAmazonCodeBrowser(codeBrowserState, tcConfig),
        );
        observerForAmazonCodeBrowser.observe(document.body, config);
      }
    })();
  },
});
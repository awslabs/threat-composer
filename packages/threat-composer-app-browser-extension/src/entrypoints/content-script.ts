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

import { getExtensionConfig, TCConfig, IntegrationTypes } from './popup/config';
import { logDebugMessage } from '../debugLogger';

const tcButtonText = 'View in Threat Composer';
const tcButtonId = 'threatComposerButton';

interface TCJSONSimplifiedSchema {
  schema?: string;
}

interface TCGitHubState {
  previousUrl: string;
  stopProcessing: boolean;
}

interface TCCodeCatalystState {
  previousUrl: string;
  stopProcessing: boolean;
}

interface TCCodeBrowserState {
  stopProcessing: boolean;
}

interface TCBitBucketState {
  stopProcessing: boolean;
}

interface TCGitLabState {
  previousUrl: string;
  stopProcessing: boolean;
}

function forwardFetchToBackground(message: any): Promise<TCJSONSimplifiedSchema> {
  return browser.runtime.sendMessage(message).then((response: any) => {
    if (!response) throw browser.runtime.lastError;
    return response;
  });
}

function isLikelyThreatComposerSchema(JSONobj: TCJSONSimplifiedSchema) {
  return JSONobj.schema ? true : false;
};

async function getTCJSONCandidate(url: string, element: HTMLElement, config: TCConfig) {
  return forwardFetchToBackground({ url: url })
    .then(function (tcJSONCandidate) {
      logDebugMessage(config, 'Able to get a JSON candidate');
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
            (element as HTMLInputElement).style.pointerEvents = 'auto';
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
    })
    .catch(function (error) {
      console.log(error);
      logDebugMessage(config, 'Error during fetch: ' + error.message);
    });
};

async function handleRawFile(config: TCConfig) {
  const element = document.getElementsByTagName('pre');
  const tcButton = document.createElement('button');
  tcButton.textContent = tcButtonText;
  tcButton.id = tcButtonId;
  tcButton.disabled = true;
  if (element) {
    document.body.prepend(tcButton);
    window.scrollTo(0, 0); //Scroll to top
  }
  logDebugMessage(config, 'Proactively attempting to retrieve candidate');
  const url = window.location.toString();
  await getTCJSONCandidate(url, tcButton, config);
};

function isRawSite(tcConfig: TCConfig) {
  if (matchesAnyRegex(window.location.href, tcConfig.integrations[IntegrationTypes.RAW].urlRegexes)) {return true;}
  return false;
}

function isGitLabSite(tcConfig: TCConfig) {
  if (matchesAnyRegex(window.location.href, tcConfig.integrations[IntegrationTypes.GITLAB].urlRegexes)) {return true;}

  // Check for the presence of GitLab-specific classes or IDs
  const gitlabElements = document.querySelectorAll('[class*="gl-"], [id*="gl-"]');
  if (gitlabElements.length > 0) {
    return true;
  }

  // If none of the above checks pass, assume it's not a GitLab site
  return false;
}

function isGitHubSite(tcConfig: TCConfig) {
  if (matchesAnyRegex(window.location.href, tcConfig.integrations[IntegrationTypes.GITHUB].urlRegexes)) {return true;}
  return false;
}

function isCodeCatalystSite(tcConfig: TCConfig) {
  if (matchesAnyRegex(window.location.href, tcConfig.integrations[IntegrationTypes.CODECATALYST].urlRegexes)) {return true;}
  return false;
}

function isAmazonCodeBrowser(tcConfig: TCConfig) {
  if (matchesAnyRegex(window.location.href, tcConfig.integrations[IntegrationTypes.CODEAMAZON].urlRegexes)) {return true;}
  return false;
}

function isBitbucketSite(tcConfig: TCConfig) {
  if (matchesAnyRegex(window.location.href, tcConfig.integrations[IntegrationTypes.BITBUCKET].urlRegexes)) {return true;}

  // Check for the presence of Bitbucket-specific elements
  const bitbucketMeta = document.querySelectorAll('meta[name="application-name"][content="Bitbucket"]');
  if (bitbucketMeta.length > 0) {
    return true;
  }

  // If none of the above checks pass, assume it's not a Bitbucket site
  return false;
}

function ViewInThreatComposerButtonExists() {
  return document.getElementById(tcButtonId);
}

async function handleGitHubCodeBrowser(gitHubState: TCGitHubState, tcConfig: TCConfig) {

  if (window.location.href != gitHubState.previousUrl) {
    //Handle GitHub being a SPA
    gitHubState.previousUrl = window.location.href;
    gitHubState.stopProcessing = false;
  }

  if (ViewInThreatComposerButtonExists()) {return;}

  var regExCheck = new RegExp(tcConfig.fileExtension);

  if (window.location.href.match(regExCheck)) {
    let element = document.querySelector('[aria-label="Copy raw content"]');

    if (element && !gitHubState.stopProcessing) {
      logDebugMessage(tcConfig, 'Element (copy raw content) found and stopProcessing = false... lets do it');
      gitHubState.stopProcessing = true;
      const rawButton = document.querySelector('[aria-label="Copy raw content"]');
      const tcButton = document.createElement('button');
      tcButton.textContent = tcButtonText;
      tcButton.id = tcButtonId;
      tcButton.disabled = true;
      tcButton.setAttribute('type', 'button');
      tcButton.setAttribute('class', rawButton?.classList.toString());
      tcButton.setAttribute('data-size', 'small');
      tcButton.style.width = '100%';
      rawButton?.before(tcButton);
      logDebugMessage(tcConfig, 'Proactively attempting to retrieve candidate');
      const url = window.location + '?raw=1';
      await getTCJSONCandidate(url, tcButton, tcConfig);
    }
  }
};

async function handleAmazonCodeBrowser(codeBrowserState: TCCodeBrowserState, config: TCConfig) {

  if (ViewInThreatComposerButtonExists()) {return;}

  const element = document.getElementsByClassName('file_header');
  if (element && !codeBrowserState.stopProcessing) {
    codeBrowserState.stopProcessing = true;
    const fileActionsDiv = document.getElementById('file_actions');
    if (fileActionsDiv) {
      const fileActionsButtonGroup = fileActionsDiv.getElementsByClassName('button_group')[0];
      const tcListItem = document.createElement('li');
      const tcButton = document.createElement('a');
      tcButton.textContent = tcButtonText;
      tcButton.id = tcButtonId;
      tcButton.setAttribute('class', 'minibutton');
      tcButton.textContent = tcButtonText;
      tcButton.style.pointerEvents = 'none';
      tcListItem.appendChild(tcButton);
      fileActionsButtonGroup.appendChild(tcListItem);
      logDebugMessage(config, 'Proactively attempting to retrieve candidate');
      const url = window.location + '?raw=1';
      await getTCJSONCandidate(url, tcButton, config);
    }
  }
};

function checkNoPresentation(element: HTMLElement) {
  // Base case: if the element is a div with role="presentation"
  if (element.tagName === 'DIV' && element.getAttribute('role') === 'presentation') {
    return false;
  }

  // Recursive case: check all child elements
  for (let child of element.children) {
    if (!checkNoPresentation(child as HTMLElement)) {
      return false;
    }
  }

  // If we've made it this far, no matching elements were found
  return true;
}

async function handleBitbucketCodeBrowser(bitBucketState: TCBitBucketState, config: TCConfig) {

  if (ViewInThreatComposerButtonExists()) {return;}

  const element = document.querySelectorAll("[data-testid='file-actions']")[0];

  if (element && element.hasChildNodes() && checkNoPresentation(element as HTMLElement) && !bitBucketState.stopProcessing) {
    bitBucketState.stopProcessing = true;
    const fileMenu = (document.querySelectorAll("[data-qa='bk-file__menu']")[0] as HTMLElement);
    const editButtonClone = document.querySelectorAll("[data-qa='bk-file__action-button']")[0].cloneNode(true);
    (editButtonClone.childNodes[0].childNodes[0].childNodes[0].childNodes[0] as HTMLElement).innerText = 'View in Threat Composer';
    (editButtonClone.childNodes[0].childNodes[0] as HTMLElement).style.pointerEvents = 'none';
    (editButtonClone.childNodes[0].childNodes[0] as HTMLInputElement).disabled = true;
    element.insertBefore(editButtonClone, fileMenu);
    const cleanPath = location.pathname.replace(/^[/]|[/]$/g, '');
    const match = /^[^/]+[/][^/]+[/]?(.*)$/.exec(cleanPath);
    if (match && match[1]) {
      const rawPathSegment = match[1].replace(/^src\//, 'raw/');
      const currentUrl = window.location.href;
      const url = currentUrl.replace(match[1], rawPathSegment);
      logDebugMessage(config, 'Proactively attempting to retrieve candidate');
      await getTCJSONCandidate(url, editButtonClone.childNodes[0] as HTMLElement, config);
    }
  }
}

async function handleGitLabBrowser(gitLabState: TCGitLabState, tcConfig: TCConfig) {

  if (window.location.href != gitLabState.previousUrl) {
    //Handle GitLab being a SPA
    gitLabState.previousUrl = window.location.href;
    gitLabState.stopProcessing = false;
  }

  if (ViewInThreatComposerButtonExists()) {return;}

  var regExCheck = new RegExp(tcConfig.fileExtension);
  if (window.location.href.match(regExCheck)) {
    const element = (document.querySelectorAll("a[title='Open raw']")[0] as HTMLElement);
    if (element && !gitLabState.stopProcessing) {
      logDebugMessage(tcConfig, 'Triggering UI update for GitLab');
      gitLabState.stopProcessing = true;
      const tcButton = document.createElement('a');
      tcButton.id = tcButtonId;
      tcButton.setAttribute('class', element.classList.toString());
      tcButton.innerText = tcButtonText;
      tcButton.style.pointerEvents = 'none';
      element.parentNode?.insertBefore(tcButton, element);
      const rawPath = location.href.replace(/\/\-\/blob/, '/-/raw');
      logDebugMessage(tcConfig, 'Proactively attempting to retrieve candidate');
      await getTCJSONCandidate(rawPath, tcButton as HTMLElement, tcConfig);
    }
  }
}

async function handleCodeCatalystCodeViewer(codeCatalystState: TCCodeCatalystState, config: TCConfig) {

  if (window.location.href != codeCatalystState.previousUrl) {
    //Handle CodeCatalyst being a SPA
    codeCatalystState.previousUrl = window.location.href;
    codeCatalystState.stopProcessing = false;
  }

  if (ViewInThreatComposerButtonExists()) {return;}

  const element = document.getElementsByClassName(
    'cs-Tabs__tab-header-actions',
  )[0];
  if (element && element.hasChildNodes() && !codeCatalystState.stopProcessing) {
    codeCatalystState.stopProcessing = true;
    const tcButton = document.createElement('a');
    tcButton.id = tcButtonId;
    const currentAnchor = element.firstChild;
    tcButton.setAttribute(
      'class',
      currentAnchor?.classList.toString(),
    );

    const currentSpan = currentAnchor?.firstChild;

    const tcSpan = document.createElement('span');
    tcSpan.setAttribute('class', currentSpan.classList.toString());
    tcSpan.textContent = tcButtonText;

    tcButton.appendChild(tcSpan);

    tcButton.onclick = function () {
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
    actionsDiv.appendChild(tcButton);
  }
};

async function ContentScriptInScope(tcConfig: TCConfig) {
  let inScopeRegexes = [tcConfig.baseUrlRegex];

  if (tcConfig.integrations[IntegrationTypes.RAW].enabled) {
    tcConfig.integrations[IntegrationTypes.RAW].urlRegexes.forEach(entry => {
      inScopeRegexes.push(entry);
    });
  }

  if (tcConfig.integrations[IntegrationTypes.CODEAMAZON].enabled) {
    tcConfig.integrations[IntegrationTypes.CODEAMAZON].urlRegexes.forEach(entry => {
      inScopeRegexes.push(entry);
    });
  }

  if (tcConfig.integrations[IntegrationTypes.BITBUCKET].enabled) {
    tcConfig.integrations[IntegrationTypes.BITBUCKET].urlRegexes.forEach(entry => {
      inScopeRegexes.push(entry);
    });
  }

  if (tcConfig.integrations[IntegrationTypes.CODECATALYST].enabled) {
    tcConfig.integrations[IntegrationTypes.CODECATALYST].urlRegexes.forEach(entry => {
      inScopeRegexes.push(entry);
    });
  }

  if (tcConfig.integrations[IntegrationTypes.GITHUB].enabled) {
    tcConfig.integrations[IntegrationTypes.GITHUB].urlRegexes.forEach(entry => {
      inScopeRegexes.push(entry);
    });
  }

  if (tcConfig.integrations[IntegrationTypes.GITLAB].enabled) {
    tcConfig.integrations[IntegrationTypes.GITLAB].urlRegexes.forEach(entry => {
      inScopeRegexes.push(entry);
    });
  }

  let match = false;

  inScopeRegexes.forEach(entry => {
    if (window.location.href.match(entry)) {
      logDebugMessage(tcConfig, 'Got a URL match for regex entry: ' + entry);
      match = true;
    }
  });
  return match;
}

function matchesAnyRegex(url: string, regexArray: string[]) {
  return regexArray.some(regex => new RegExp(regex).test(url));
}

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
      previousUrl: '',
      stopProcessing: false,
    };

    const bitBucketState: TCBitBucketState = {
      stopProcessing: false,
    };

    const gitLabState: TCGitLabState = {
      previousUrl: '',
      stopProcessing: false,
    };

    void (async function () {

      const tcConfig = await getExtensionConfig();

      const config = {
        childList: true,
        subtree: true,
      };

      if (!await ContentScriptInScope(tcConfig)) {
        logDebugMessage(tcConfig, 'Not triggering content script main logic - URL not in scope');
        return;
      } else {
        logDebugMessage(tcConfig, 'Triggering content script main logic - URL IS in scope');
      }

      if (
        tcConfig.integrations[IntegrationTypes.RAW].enabled && isRawSite(tcConfig)) {
        logDebugMessage(tcConfig, 'Assuming raw file view');
        await handleRawFile(tcConfig);
      } else if (tcConfig.integrations[IntegrationTypes.GITLAB].enabled && isGitLabSite(tcConfig)) {
        logDebugMessage(tcConfig, 'Assuming GitLab code browser');
        await handleGitLabBrowser(gitLabState, tcConfig);
        let observerForGitLabCodeBrowser = new MutationObserver(
          () => handleGitLabBrowser(gitLabState, tcConfig),
        );
        observerForGitLabCodeBrowser.observe(document, config); //Scope is `document` as GitLab is a SPA
      } else if (
        tcConfig.integrations[IntegrationTypes.GITHUB].enabled && isGitHubSite(tcConfig)
      ) {
        logDebugMessage(tcConfig,
          'Assuming GitHub code browser',
        );
        await handleGitHubCodeBrowser(gitHubState, tcConfig);
        let observerForGitHubCodeViewer = new MutationObserver(
          () => handleGitHubCodeBrowser(gitHubState, tcConfig),
        );
        observerForGitHubCodeViewer.observe(document, config); //Scope is `document` as GitHub is a SPA
      } else if (
        tcConfig.integrations[IntegrationTypes.CODECATALYST].enabled && isCodeCatalystSite(tcConfig)
      ) {
        logDebugMessage(tcConfig, 'Assuming Code Catalyst code browser');
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
        observerForCodeCatalystCodeViewer.observe(document, config);
      } else if (
        tcConfig.integrations[IntegrationTypes.CODEAMAZON].enabled && isAmazonCodeBrowser(tcConfig)
      ) {
        logDebugMessage(tcConfig, 'Assuming Amazon code browser');
        await handleAmazonCodeBrowser(codeBrowserState, tcConfig);
        let observerForAmazonCodeBrowser = new MutationObserver(
          () => handleAmazonCodeBrowser(codeBrowserState, tcConfig),
        );
        observerForAmazonCodeBrowser.observe(document.body, config);
      } else if (
        tcConfig.integrations[IntegrationTypes.BITBUCKET].enabled &&
        isBitbucketSite(tcConfig)
      ) {
        console.log(tcConfig);
        logDebugMessage(tcConfig, 'URL is bitbucket.org - Assuming Bitbucket code browser');
        await handleBitbucketCodeBrowser(codeBrowserState, tcConfig);
        let observerForBitbucketCodeBrowser = new MutationObserver(
          () => handleBitbucketCodeBrowser(bitBucketState, tcConfig),
        );
        observerForBitbucketCodeBrowser.observe(document.body, config);
      }
    })();
  },
});
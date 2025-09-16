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
import { getExtensionConfig, TCConfig, IntegrationTypes } from './popup/config';

// WXT framework imports
declare const defineContentScript: any;
declare const browser: any;

const tcButtonText = 'View in Threat Composer';
const tcButtonId = 'threatComposerButton';

interface TCJSONSimplifiedSchema {
  schema?: string;
}

interface TCAmazonCodeState {
  stopProcessing: boolean;
}

interface TCCodeCatalystState {
  previousUrl: string;
  stopProcessing: boolean;
}

interface TCBitbucketState {
  stopProcessing: boolean;
}

interface TCGitHubState {
  previousUrl: string;
  stopProcessing: boolean;
}

interface TCGitLabState {
  previousUrl: string;
  stopProcessing: boolean;
}

function forwardFetchToBackground(message: any): Promise<TCJSONSimplifiedSchema> {
  return browser.runtime.sendMessage(message).then((response: any) => {
    if (browser.runtime.lastError) {
      throw new Error(browser.runtime.lastError.message);
    }
    if (!response) {
      throw new Error('No response received from background script');
    }
    return response;
  });
}

function isLikelyThreatComposerSchema(JSONobj: TCJSONSimplifiedSchema) {
  return JSONobj.schema ? true : false;
};

async function extractContentDirectly(config: TCConfig): Promise<string | null> {
  try {
    // Try multiple strategies to extract content from the DOM

    // Strategy 1: Look for <pre> tag (common in raw file views)
    const preElement = document.querySelector('pre');
    if (preElement && preElement.textContent) {
      logDebugMessage(config, 'Found content in <pre> element');
      return preElement.textContent.trim();
    }

    // Strategy 2: Look for code blocks
    const codeElement = document.querySelector('code');
    if (codeElement && codeElement.textContent) {
      logDebugMessage(config, 'Found content in <code> element');
      return codeElement.textContent.trim();
    }

    // Strategy 3: Try body text content as fallback
    const bodyText = document.body.textContent;
    if (bodyText && bodyText.trim().startsWith('{')) {
      logDebugMessage(config, 'Found JSON-like content in body');
      return bodyText.trim();
    }

    logDebugMessage(config, 'No suitable content found in DOM');
    return null;
  } catch (error) {
    logDebugMessage(config, 'Error during direct content extraction: ' + (error as Error).message);
    return null;
  }
}

async function processTCCandidate(content: string, element: HTMLElement, config: TCConfig) {
  try {
    // Try to parse the content as JSON
    const jsonObj: TCJSONSimplifiedSchema = JSON.parse(content);

    if (isLikelyThreatComposerSchema(jsonObj)) {
      logDebugMessage(config,
        'Looks like it could be a Threat Composer file, enabling ' +
        element.textContent +
        ' button',
      );

      element.onclick = function () {
        logDebugMessage(config,
          'Sending message with candidate JSON object back to service worker / background script',
        );
        browser.runtime.sendMessage(jsonObj);
      };

      switch (element.tagName) {
        case 'BUTTON':
          (element as HTMLInputElement).disabled = false;
          break;
        case 'A':
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
  } catch (error) {
    logDebugMessage(config, 'Error parsing JSON content: ' + (error as Error).message);
  }
}

async function getTCJSONCandidate(url: string, element: HTMLElement, tcConfig: TCConfig) {
  return forwardFetchToBackground({ url: url })
    .then(function (tcJSONCandidate) {
      logDebugMessage(tcConfig, 'Able to get a JSON candidate');
      if (tcJSONCandidate && isLikelyThreatComposerSchema(tcJSONCandidate)) {
        logDebugMessage(tcConfig,
          'Looks like it could be a Threat Composer file, enabling ' +
          element.textContent +
          ' button',
        );
        element.onclick = function () {
          logDebugMessage(tcConfig,
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
        logDebugMessage(tcConfig,
          "Does NOT look like it's a Threat Composer file, NOT enabling " +
          element.textContent +
          ' button',
        );
      }
    })
    .catch(function (error) {
      logDebugMessage(tcConfig, 'Error during fetch: ' + error.message);
    });
};

function createTCButton() {
  const tcButton = document.createElement('button');
  tcButton.textContent = tcButtonText;
  tcButton.id = tcButtonId;
  tcButton.disabled = true;
  return tcButton;
}

async function handleRawFile(config: TCConfig) {
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
};

async function handleRaw(tcConfig: TCConfig) {
  await handleRawFile(tcConfig);
};

function isRawSite(tcConfig: TCConfig) {
  if (document.getElementsByTagName('pre')[0]) {
    logDebugMessage(tcConfig, 'Appears to be a raw site due to <pre> tag being present');
    return true;
  }
  return false;
}

function isGitLabSite(tcConfig: TCConfig) {
  if (matchesAnyRegex(window.location.href, tcConfig.integrations[IntegrationTypes.GITLAB].urlRegexes)) {return true;}
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

function isAmazonCodeSite(tcConfig: TCConfig) {
  if (matchesAnyRegex(window.location.href, tcConfig.integrations[IntegrationTypes.CODEAMAZON].urlRegexes)) {return true;}
  return false;
}

function isBitbucketSite(tcConfig: TCConfig) {
  if (matchesAnyRegex(window.location.href, tcConfig.integrations[IntegrationTypes.BITBUCKET].urlRegexes)) {return true;}
  return false;
}

function ViewInThreatComposerButtonExists() {
  return document.getElementById(tcButtonId);
}

// Multi-strategy GitHub raw button detection
function findGitHubRawButton(): HTMLElement | null {
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

// Extract styling from existing GitHub buttons dynamically
function extractGitHubButtonStyling(rawButton: HTMLElement): { classes: string; attributes: Record<string, string> } {
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

// Smart button group detection and insertion
function insertThreatComposerButton(rawButton: HTMLElement, config: TCConfig): HTMLElement {
  const tcButton = createTCButton();

  // Extract actual styling from the raw button
  const { classes, attributes } = extractGitHubButtonStyling(rawButton);

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

    logDebugMessage(config, 'Inserted Threat Composer button in GitHub UI button group with extracted styling');
  } else {
    // Fallback: insert after raw button directly (old UI)
    rawButton.after(tcButton);

    logDebugMessage(config, 'Inserted Threat Composer button using fallback method with extracted styling');
  }

  return tcButton;
}

// Robust URL extraction
function getRawUrl(rawButton: HTMLElement): string {
  // Try to get URL from raw button href
  const href = rawButton.getAttribute('href');
  if (href && href.includes('/raw/')) {
    const fullUrl = new URL(href, window.location.origin).toString();
    return fullUrl;
  }

  // Fallback to current approach
  return window.location + '?raw=1';
}

async function handleGitHubCodeViewer(gitHubState: TCGitHubState, config: TCConfig) {
  var regExCheck = new RegExp(config.fileExtension);
  if (window.location.href.match(regExCheck)) {
    // Use multi-strategy approach to find raw button
    let rawButton = findGitHubRawButton();

    if (window.location.href != gitHubState.previousUrl) {
      //Handle GitHub being a SPA
      gitHubState.previousUrl = window.location.href;
      gitHubState.stopProcessing = false;
    }

    if (rawButton && !gitHubState.stopProcessing) {
      gitHubState.stopProcessing = true;

      logDebugMessage(config, 'Found GitHub raw button using multi-strategy approach');

      // Smart button insertion with dynamic styling
      const tcButton = insertThreatComposerButton(rawButton, config);

      // Robust URL construction
      const url = getRawUrl(rawButton);
      logDebugMessage(config, 'Using raw URL: ' + url);

      logDebugMessage(config, 'Proactively attempting to retrieve candidate');
      await getTCJSONCandidate(url, tcButton, config);
    } else if (!rawButton) {
      logDebugMessage(config, 'Could not find GitHub raw button with any strategy');
    }
  }
};

async function handleGitHub(gitHubState: TCGitHubState, tcConfig: TCConfig) {

  if (ViewInThreatComposerButtonExists()) {return;}

  var regExCheck = new RegExp(tcConfig.fileExtension);

  if (isRawSite(tcConfig) && window.location.href.match(regExCheck)) {
    await handleRaw(tcConfig);
    return;
  }

  await handleGitHubCodeViewer(gitHubState, tcConfig);
};

async function handleAmazonCode(codeBrowserState: TCAmazonCodeState, tcConfig: TCConfig) {

  if (ViewInThreatComposerButtonExists()) {return;}

  var regExCheck = new RegExp(tcConfig.fileExtension);

  if (isRawSite(tcConfig) && window.location.href.match(regExCheck)) {
    await handleRaw(tcConfig);
    return;
  }

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
      logDebugMessage(tcConfig, 'Proactively attempting to retrieve candidate');
      const url = window.location + '?raw=1';
      await getTCJSONCandidate(url, tcButton, tcConfig);
    }
  }
};

function checkNoPresentation(element: HTMLElement) {
  if (element.tagName === 'DIV' && element.getAttribute('role') === 'presentation') {
    return false;
  }

  for (let child of element.children) {
    if (!checkNoPresentation(child as HTMLElement)) {
      return false;
    }
  }

  return true;
}

async function handleBitbucket(bitBucketState: TCBitbucketState, tcConfig: TCConfig) {

  if (ViewInThreatComposerButtonExists()) {return;}

  var regExCheck = new RegExp(tcConfig.fileExtension);

  if (isRawSite(tcConfig) && window.location.href.match(regExCheck)) {
    await handleRaw(tcConfig);
    return;
  }

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
      logDebugMessage(tcConfig, 'Proactively attempting to retrieve candidate');
      await getTCJSONCandidate(url, editButtonClone.childNodes[0] as HTMLElement, tcConfig);
    }
  }
}

async function handleGitLab(gitLabState: TCGitLabState, tcConfig: TCConfig) {

  if (ViewInThreatComposerButtonExists()) {return;}

  var regExCheck = new RegExp(tcConfig.fileExtension);

  if (isRawSite(tcConfig) && window.location.href.match(regExCheck)) {
    await handleRaw(tcConfig);
    return;
  }

  if (window.location.href != gitLabState.previousUrl) {
    //Handle GitLab being a SPA
    gitLabState.previousUrl = window.location.href;
    gitLabState.stopProcessing = false;
  }

  var regExCheck = new RegExp(tcConfig.fileExtension);
  if (window.location.href.match(regExCheck)) {
    const element = (document.querySelectorAll("a[title='Open raw']")[0] as HTMLElement);
    if (element && !gitLabState.stopProcessing) {
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

async function handleCodeCatalyst(codeCatalystState: TCCodeCatalystState, tcConfig: TCConfig) {

  if (ViewInThreatComposerButtonExists()) {return;}

  var regExCheck = new RegExp(tcConfig.fileExtension);

  if (isRawSite(tcConfig) && window.location.href.match(regExCheck)) {
    await handleRaw(tcConfig);
    return;
  }

  if (window.location.href != codeCatalystState.previousUrl) {
    //Handle CodeCatalyst being a SPA
    codeCatalystState.previousUrl = window.location.href;
    codeCatalystState.stopProcessing = false;
  }

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
      (currentAnchor as HTMLElement)?.classList.toString() || '',
    );

    const currentSpan = currentAnchor?.firstChild as HTMLElement;

    const tcSpan = document.createElement('span');
    tcSpan.setAttribute('class', currentSpan?.classList.toString() || '');
    tcSpan.textContent = tcButtonText;

    tcButton.appendChild(tcSpan);

    tcButton.onclick = function () {
      if (document.getElementById('raw-div')) {
        const rawText = document.getElementById('raw-div')!.textContent;
        if (rawText) {
          const jsonObj: TCJSONSimplifiedSchema = JSON.parse(rawText);
          logDebugMessage(tcConfig,
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
  let inScopeRegexes:string[] = [];

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

    const amazonCodeState: TCAmazonCodeState = {
      stopProcessing: false,
    };

    const codeCatalystState: TCCodeCatalystState = {
      previousUrl: '',
      stopProcessing: false,
    };

    const bitbucketState: TCBitbucketState = {
      stopProcessing: false,
    };

    const gitLabState: TCGitLabState = {
      previousUrl: '',
      stopProcessing: false,
    };

    void (async function () {

      const tcConfig = await getExtensionConfig();

      const observerConfig = {
        childList: true,
        subtree: true,
      };

      if (!await ContentScriptInScope(tcConfig)) {
        logDebugMessage(tcConfig, 'Aborting execution. URL not in scope of any regexes');
        return;
      } else {
        logDebugMessage(tcConfig, 'Continuing content script execution. URL IS in scope of atleast one regex');
      }

      if (tcConfig.integrations[IntegrationTypes.GITLAB].enabled && isGitLabSite(tcConfig)) {
        logDebugMessage(tcConfig, 'Assuming GitLab...');
        await handleGitLab(gitLabState, tcConfig);
        let observerForGitLab = new MutationObserver(
          () => handleGitLab(gitLabState, tcConfig),
        );
        observerForGitLab.observe(document, observerConfig); //Scope is `document` as GitLab is a SPA
      } else if (
        tcConfig.integrations[IntegrationTypes.GITHUB].enabled && isGitHubSite(tcConfig)
      ) {
        logDebugMessage(tcConfig, 'Assuming GitHub...');
        await handleGitHub(gitHubState, tcConfig);
        let observerForGitHub = new MutationObserver(
          () => handleGitHub(gitHubState, tcConfig),
        );
        observerForGitHub.observe(document, observerConfig); //Scope is `document` as GitHub is a SPA
      } else if (
        tcConfig.integrations[IntegrationTypes.CODECATALYST].enabled && isCodeCatalystSite(tcConfig)
      ) {
        logDebugMessage(tcConfig, 'Assuming Amazon CodeCatalyst...');
        //Inject script
        const s = document.createElement('script');
        s.src = browser.runtime.getURL('scriptInjectForCodeCatalyst.js');
        s.onload = function () {
          (this as HTMLScriptElement).remove();
        };
        (document.head || document.documentElement).appendChild(s);
        let observerForCodeCatalyst = new MutationObserver(
          () => handleCodeCatalyst(codeCatalystState, tcConfig),
        );
        observerForCodeCatalyst.observe(document, observerConfig);
      } else if (
        tcConfig.integrations[IntegrationTypes.CODEAMAZON].enabled && isAmazonCodeSite(tcConfig)
      ) {
        logDebugMessage(tcConfig, 'Assuming Amazon Code...');
        await handleAmazonCode(amazonCodeState, tcConfig);
        let observerForAmazonCode = new MutationObserver(
          () => handleAmazonCode(amazonCodeState, tcConfig),
        );
        observerForAmazonCode.observe(document.body, observerConfig);
      } else if (
        tcConfig.integrations[IntegrationTypes.BITBUCKET].enabled &&
        isBitbucketSite(tcConfig)
      ) {
        logDebugMessage(tcConfig, 'Assuming Bitbucket...');
        await handleBitbucket(bitbucketState, tcConfig);
        let observerForBitbucket = new MutationObserver(
          () => handleBitbucket(bitbucketState, tcConfig),
        );
        observerForBitbucket.observe(document.body, observerConfig);
      }
    })();
  },
});

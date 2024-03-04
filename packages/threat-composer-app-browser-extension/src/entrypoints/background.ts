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

import { ThreatComposerTarget, getExtensionConfig } from './popup/config';
import { logDebugMessage } from '../debugLogger';


export default defineBackground(() => {

  browser.runtime.onMessage.addListener(function (request: any, sender: any, sendResponse: any) {

    getExtensionConfig().then(config => {
      const tcViewer = config.target;
      let tcUrl = '';

      if (tcViewer == ThreatComposerTarget.BUILT_IN) {
        tcUrl = browser.runtime.getURL('');
      } else if (tcViewer == ThreatComposerTarget.GITHUB_PAGES) {
        tcUrl = 'https://awslabs.github.io/threat-composer';
      } else if (tcViewer == ThreatComposerTarget.CUSTOM_HOST) {
        tcUrl = config.customUrl ?? '';
      }

      if (request.schema) { //This is likely the JSON from a threat model
        logDebugMessage(config, 'Message recieved - Threat Model JSON');

        browser.storage.local.set({ threatModel: request }).then(() => {
          logDebugMessage(config, 'Saved to browser storage');
        });

        browser.tabs.query({ url: tcUrl + '*' }).then((tabs: any) => {
          if (tabs.length > 0) {
            browser.tabs.update(tabs[0].id, { active: true, url: tcUrl + 'index.html' });
          } else {
            browser.tabs.create({ url: tcUrl + 'index.html' });
          }
        });
        sendResponse({});
      } else if (request.url) { //This is likely the a request to proxy a Fetch
        sendResponse(fetch(request.url)
          .then((response) => response.json())
          .catch((error) => {
            logDebugMessage({ debug: true } as any, error);
          }));
      }
    }).catch((error) => {
      logDebugMessage({ debug: true } as any, error);
    });

    // As we will reply asynchronously to the request, we need to tell chrome to wait for our response
    return true;
  });
});
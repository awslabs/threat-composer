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

import { getExtensionConfig, ThreatComposerTarget } from './popup/config';
import { logDebugMessage } from '../debugLogger';

export default defineBackground(() => {
  getExtensionConfig().then(config => {
    logDebugMessage(config, 'index.hml is here:' + browser.runtime.getURL('index.html'));

    browser.runtime.onMessage.addListener(function (request: any) {
      const tcViewer = config.target;
      let tcUrlCreate = '';
      let tcUrlUpdate = '';

      if (tcViewer == ThreatComposerTarget.BUILT_IN) {
        tcUrlCreate = browser.runtime.getURL('index.html');
        tcUrlUpdate = browser.runtime.getURL('*');
      } else if (tcViewer == ThreatComposerTarget.GITHUB_PAGES) {
        tcUrlCreate = 'https://awslabs.github.io/threat-composer';
        tcUrlUpdate = tcUrlCreate;
      } else if (tcViewer == ThreatComposerTarget.CUSTOM_HOST) {
        tcUrlCreate = config.customUrl ?? '';
        tcUrlUpdate = tcUrlCreate;
      }

      if (request.schema) {
        //This is likely the JSON from a threat model
        logDebugMessage(config, 'Message recieved - Threat Model JSON');

        browser.storage.local.set({ threatModel: request }).then(() => {
          logDebugMessage(config, 'Saved to browser storage');
        });

        browser.tabs.query({ url: tcUrlUpdate }).then((tabs: any) => {
          if (tabs.length > 0) {
            browser.tabs.update(tabs[0].id, { active: true });
          } else {
            browser.tabs.create({ url: tcUrlCreate });
          }
        });
      } else if (request.url) {
        return fetch(request.url)
          .then((response) => response.json())
          .catch((error) => {
            console.log(error);
          });
        // As we will reply asynchronously to the request, we need to tell chrome to wait for our response
        //return true;
      }
    });
  }).catch((error) => {
    logDebugMessage({ debug: true } as any, error);
  });
});
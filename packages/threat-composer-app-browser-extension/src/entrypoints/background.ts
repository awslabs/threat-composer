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
import { getExtensionConfig } from './popup/config';


export default defineBackground(() => {

  browser.runtime.onMessage.addListener(function (request: any, sender: any, sendResponse: any) {

    getExtensionConfig().then(config => {

      const tcUrl = browser.runtime.getURL('');

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
        logDebugMessage(config, 'Fetching URL: ' + request.url);

        // Simplified but robust fetch handling
        fetch(request.url)
          .then((response) => {
            const contentType = response.headers.get('content-type') || '';

            // For proper JSON content-type, use response.json()
            if (contentType.includes('application/json')) {
              return response.json();
            }

            // For everything else (including octet-stream), use arrayBuffer + TextDecoder
            return response.arrayBuffer().then((buffer) => {
              const decoder = new TextDecoder('utf-8');
              const decodedText = decoder.decode(buffer);
              return JSON.parse(decodedText);
            });
          })
          .then((result) => {
            sendResponse(result);
          })
          .catch((error) => {
            logDebugMessage(config, 'Fetch error: ' + error);
            sendResponse(null);
          });
      }
    }).catch((error) => {
      logDebugMessage({ debug: true } as any, error);
    });

    // As we will reply asynchronously to the request, we need to tell chrome to wait for our response
    return true;
  });
});

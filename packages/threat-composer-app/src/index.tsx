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
import { ThemeProvider, Mode } from '@aws/threat-composer';
import React from 'react';
import ReactDOM from 'react-dom';
import { BUILD_FAMILY_NAME, BUILD_TIMESTAMP, BUILD_RANDOM_INDEX } from './buildConstants';
import App from './containers/App';
import reportWebVitals from './reportWebVitals';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';
import isMemoryRouterUsed from './utils/isMemoryRouterUsed';

//For the ide-extension, the theme can be set via meta tag.
const initialThemeString = (document.querySelector('meta[name="dark-mode"]') as HTMLMetaElement)?.content;

let initialTheme = initialThemeString ?
  (initialThemeString === 'true' ? Mode.Dark : Mode.Light) :
  undefined;

// Display build-time selected family name
console.log(`🏠 Build Family: ${BUILD_FAMILY_NAME} (selected from 950 unique family names at index ${BUILD_RANDOM_INDEX})`);
console.log(`📅 Build Time: ${BUILD_TIMESTAMP}`);

ReactDOM.render(
  <React.StrictMode>
    <ThemeProvider theme={initialTheme} appMode={process.env.REACT_APP_APP_MODE || undefined}>
      <App />
    </ThemeProvider>
  </React.StrictMode>,
  document.getElementById('root'),
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://cra.link/PWA
!isMemoryRouterUsed() && serviceWorkerRegistration.register();

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

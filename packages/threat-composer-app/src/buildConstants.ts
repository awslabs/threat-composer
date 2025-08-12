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

// Build constants injected at build time via webpack DefinePlugin
// These values are set by scripts/generate-build-constants.js and injected during compilation

export const BUILD_FAMILY_NAME = process.env.REACT_APP_BUILD_FAMILY_NAME || 'Unknown';
export const BUILD_TIMESTAMP = process.env.REACT_APP_BUILD_TIMESTAMP || new Date().toISOString();
export const BUILD_RANDOM_INDEX = parseInt(process.env.REACT_APP_BUILD_RANDOM_INDEX || '0', 10);

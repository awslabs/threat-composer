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
import { useState } from 'react';
import { logDebugMessage } from '../../debugLogger';

export enum ThreatComposerTarget {
  BUILT_IN = 'BUILT_IN',
  GITHUB_PAGES = 'GITHUB_PAGES',
  CUSTOM_HOST = 'CUSTOM_HOST',
}


export interface TCConfig {
  baseUrlRegex: RegExp;
  debug: boolean;
  fileExtension: string;
  integrationAmazonCodeBrowser: boolean;
  integrationAmazonCodeBrowserUrlRegexes: RegExp[];
  integrationBitBucketCodeBrowser: boolean;
  integrationBitBucketCodeBrowserUrlRegexes: RegExp[];
  integrationCodeCatalystCodeBrowser: boolean;
  integrationCodeCatalystCodeBrowserUrlRegexes: RegExp[];
  integrationGitHubCodeBrowser: boolean;
  integrationGitHubCodeBrowserUrlRegexes: RegExp[];
  integrationGitLabCodeBrowser: boolean;
  integrationGitLabCodeBrowserUrlRegexes: RegExp[];
  integrationRaw: boolean;
  integrationRawUrlRegexes: RegExp[];
  target: ThreatComposerTarget;
}

export const DefaultConfig: TCConfig = {
  baseUrlRegex: /^.*:\/\/.*\/.*\.tc\.json([?#].*)?$/,
  debug: true,
  fileExtension: '.tc.json',
  integrationAmazonCodeBrowser: true,
  integrationAmazonCodeBrowserUrlRegexes: [/code.amazon.com/],
  integrationBitBucketCodeBrowser: true,
  integrationBitBucketCodeBrowserUrlRegexes: [/bitbucket.org/],
  integrationCodeCatalystCodeBrowser: true,
  integrationCodeCatalystCodeBrowserUrlRegexes: [/codecatalyst.aws/],
  integrationGitHubCodeBrowser: true,
  integrationGitHubCodeBrowserUrlRegexes: [/github.com/],
  integrationGitLabCodeBrowser: true,
  integrationGitLabCodeBrowserUrlRegexes: [/gitlab.com/],
  integrationRaw: true,
  integrationRawUrlRegexes: [/raw.githubusercontent.com/, /raw=1/, /raw/],
  target: ThreatComposerTarget.BUILT_IN,
};


export async function getExtensionConfig(): Promise<TCConfig> {
  const config = await browser.storage.local.get(['tcConfig']); //TODO: Consider if this could return an exeption or is it just undefined?

  if (config.tcConfig && Object.keys(config.tcConfig).length) {
    return config.tcConfig;
  } else {
    return DefaultConfig;
  }
}

export function setExtensionConfig(config: TCConfig) {
  browser.storage.local.set({ tcConfig: config }).then(() => {
    logDebugMessage(config, 'Saved config to browser storage');
  });
}

export const useExtensionConfig = (defaultConfig: TCConfig) => {
  const [value, setValue] = useState<TCConfig>(defaultConfig);

  const handleValueChange = (doSetConfig: (prevConfig: TCConfig) => TCConfig) => {
    setValue((prev) => {
      const newConfig = doSetConfig(prev);
      setExtensionConfig(newConfig);
      return newConfig;
    });
  };

  return [value, handleValueChange] as const;
};
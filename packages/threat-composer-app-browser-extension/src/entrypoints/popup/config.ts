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
  baseUrlRegex: string;
  debug: boolean;
  fileExtension: string;
  integrations: {[integrationType: string]: IntegrationConfig };
  target: ThreatComposerTarget;
}

export interface IntegrationConfig {
  name: string;
  enabled: boolean;
  urlRegexes: string[];
}

export const IntegrationTypes = {
  GITHUB: 'github',
  GITLAB: 'gitlab',
  BITBUCKET: 'bitbucket',
  CODEAMAZON: 'codeamazon',
  CODECATALYST: 'codecatalyst',
  RAW: 'raw',
} as const;

export const DefaultConfig: TCConfig = {
  baseUrlRegex: '^.*:\/\/.*\/.*\.tc\.json([?#].*)?$',
  debug: true,
  fileExtension: '.tc.json',
  integrations: {
    [IntegrationTypes.GITHUB]: {
      name: 'GitHub',
      enabled: true,
      urlRegexes: ['github.com'],
    },
    [IntegrationTypes.GITLAB]: {
      name: 'GitLab',
      enabled: true,
      urlRegexes: ['gitlab.com'],
    },
    [IntegrationTypes.BITBUCKET]: {
      name: 'Bitbucket',
      enabled: true,
      urlRegexes: ['bitbucket.org'],
    },
    [IntegrationTypes.CODEAMAZON]: {
      name: 'Amazon Code Browser',
      enabled: true,
      urlRegexes: ['code.amazon.com'],
    },
    [IntegrationTypes.CODECATALYST]: {
      name: 'Amazon CodeCatalyst',
      enabled: true,
      urlRegexes: ['codecatalyst.aws'],
    },
    [IntegrationTypes.RAW]: {
      name: 'Raw',
      enabled: true,
      urlRegexes: ['raw.githubusercontent.com', 'raw=1', 'raw'],
    },
  },
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

export const useExtensionConfig = () => {
  const [value, setValue] = useState<TCConfig | undefined>();

  const handleValueChange = (doSetConfig: (prevConfig: TCConfig) => TCConfig) => {
    setValue((prev) => {
      const newConfig = doSetConfig(prev ?? DefaultConfig);
      setExtensionConfig(newConfig);
      return newConfig;
    });
  };

  return [value, handleValueChange] as const;
};
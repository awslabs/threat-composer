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

export interface TCConfig {
  debug: boolean;
  fileExtension: string;
  integrations: {[integrationType: string]: IntegrationConfig };
}

export interface IntegrationConfig {
  name: string;
  enabled: boolean;
  urlRegexes: string[];
  rawUrlPatterns: string[];
}

export const IntegrationTypes = {
  CODEAMAZON: 'codeamazon',
  CODECATALYST: 'codecatalyst',
  BITBUCKET: 'bitbucket',
  GITHUB: 'github',
  GITLAB: 'gitlab',
} as const;

export const DefaultConfig: TCConfig = {
  debug: false,
  fileExtension: '.tc.json',
  integrations: {
    [IntegrationTypes.CODEAMAZON]: {
      name: 'Amazon Code Browser',
      enabled: true,
      urlRegexes: ['code.amazon.com'],
      rawUrlPatterns: ['?raw=1'],
    },
    [IntegrationTypes.CODECATALYST]: {
      name: 'Amazon CodeCatalyst',
      enabled: true,
      urlRegexes: ['codecatalyst.aws'],
      rawUrlPatterns: [], // No raw support
    },
    [IntegrationTypes.BITBUCKET]: {
      name: 'Bitbucket',
      enabled: true,
      urlRegexes: ['bitbucket.org'],
      rawUrlPatterns: ['/raw/'],
    },
    [IntegrationTypes.GITHUB]: {
      name: 'GitHub',
      enabled: true,
      urlRegexes: ['github.com', 'raw.githubusercontent.com'],
      rawUrlPatterns: ['githubusercontent.com'],
    },
    [IntegrationTypes.GITLAB]: {
      name: 'GitLab',
      enabled: true,
      urlRegexes: ['gitlab.com'],
      rawUrlPatterns: ['/-/raw/'],
    },
  },
};

export async function getExtensionConfig(): Promise<TCConfig> {
  const config = await browser.storage.local.get(['tcConfig']); //TODO: Consider if this could return an exeption or is it just undefined?

  if (config.tcConfig && Object.keys(config.tcConfig).length) {
    // The cast is load-bearing rather than cosmetic: the stored value is returned
    // verbatim with no merge against DefaultConfig and no schema validation, so a
    // partial config really can come back missing `integrations`. That is a known
    // defect -- see the tests in ./__tests__/config.test.ts, and the popup case in
    // e2e/tests-extension/extension-shell.spec.ts -- and the newer WXT types now
    // surface it as a type error instead of inferring `any`.
    return config.tcConfig as TCConfig;
  } else {
    return DefaultConfig;
  }
}

export function setExtensionConfig(config: TCConfig) {
  void browser.storage.local.set({ tcConfig: config }).then(() => {
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

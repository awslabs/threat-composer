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
import { Spinner } from '@cloudscape-design/components';
import { FC, useEffect, ReactNode, createContext } from 'react';
import { TCConfig, DefaultConfig, getExtensionConfig, useExtensionConfig } from './config';
import { logDebugMessage } from '../../debugLogger';

export interface ExtensionConfigProviderProps {
  children: ReactNode;
}

export interface ConfigContext {
  config: TCConfig;
  setConfig: (doSetConfig:(prevConfig: TCConfig) => TCConfig) => void;
}

export const ExtensionConfigContext = createContext<ConfigContext>({ config: DefaultConfig, setConfig: ()=>{} });

export const ExtensionConfigProvider: FC<ExtensionConfigProviderProps> = ({ children }) => {
  const [config, setConfig] = useExtensionConfig();
  useEffect(() => {
    getExtensionConfig()
      .then((loadedConfig) => setConfig(() => loadedConfig))
      .catch((error) => {
        logDebugMessage({ debug: true } as any, error);
      });
  }, []);
  return (
    config ? (
      <ExtensionConfigContext.Provider value={{ config, setConfig }}>{children}</ExtensionConfigContext.Provider>
    ) : <Spinner size="large" />
  );
};
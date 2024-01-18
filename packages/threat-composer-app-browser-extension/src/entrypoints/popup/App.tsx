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
import { FC, useState, useEffect } from 'react';
import { TCConfig, getExtensionConfig } from './config';
import Config from './ConfigView';
import { logDebugMessage } from '../../debugLogger';

const App: FC = () => {
  const [config, setConfig] = useState<TCConfig | undefined>();

  useEffect(() => {
    getExtensionConfig()
      .then((loadedConfig) => setConfig(loadedConfig))
      .catch((error) => {
        logDebugMessage({ debug: true } as any, error);
      });
  }, []);

  return config ? <Config initialConfig={config} /> : <Spinner size="large" />;
};

export default App;

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
import { FC, PropsWithChildren } from 'react';
import ThreatsLocalStateContextProvider from './components/LocalStateContextProvider';
import ThreatsLocalStorageContextProvider from './components/LocalStorageContextProvider';
import { useThreatsContext } from './context';
import { ThreatsContextProviderProps } from './types';
import { EXAMPLE_WORKSPACE_ID } from '../../configs/constants';
import ThreatsMigration from '../../migrations/ThreatsMigration';
import { useExampleContext } from '../ExampleContext';

const ThreatsContextProvider: FC<PropsWithChildren<ThreatsContextProviderProps>> = ({ children, ...props }) => {
  const { threats } = useExampleContext();

  return props.workspaceId === EXAMPLE_WORKSPACE_ID ?
    (<ThreatsLocalStateContextProvider initialValue={threats} {...props} >
      {children}
    </ThreatsLocalStateContextProvider>) :
    (<ThreatsLocalStorageContextProvider {...props} >
      <ThreatsMigration>
        {children}
      </ThreatsMigration>
    </ThreatsLocalStorageContextProvider>);
};

export default ThreatsContextProvider;

export {
  useThreatsContext,
};
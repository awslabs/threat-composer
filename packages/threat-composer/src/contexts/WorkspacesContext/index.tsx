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
import { FC } from 'react';
import WorkspacesLocalStateContextProvider from './components/LocalStateContextProvider';
import WorkspacesLocalStorageContextProvider from './components/LocalStorageContextProvider';
import { useWorkspacesContext } from './context';
import { WorkspacesContextProviderProps } from './types';
import { APP_MODE_IDE_EXTENSION, DEFAULT_WORKSPACE_ID } from '../../configs';
import { useGlobalSetupContext } from '../GlobalSetupContext';

const WorkspacesContextProvider: FC<WorkspacesContextProviderProps> = (props) => {
  const { appMode } = useGlobalSetupContext();

  return appMode === APP_MODE_IDE_EXTENSION ?
    (<WorkspacesLocalStateContextProvider
      key={props.workspaceName || DEFAULT_WORKSPACE_ID}
      {...props} />) :
    (<WorkspacesLocalStorageContextProvider key={props.workspaceName || DEFAULT_WORKSPACE_ID} {...props} />);
};

export default WorkspacesContextProvider;

export {
  useWorkspacesContext,
  WorkspacesContextProviderProps,
};

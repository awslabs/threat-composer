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
import BrainstormLocalStorageContextProvider from './components/LocalStorageContextProvider';
import { DEFAULT_WORKSPACE_ID } from '../../configs/constants';

export * from './context';
export * from './types';

export interface BrainstormContextProviderProps {
  workspaceId?: string;
}

const BrainstormContextProvider: FC<PropsWithChildren<BrainstormContextProviderProps>> = (props) => {
  // If using in a React Router context, you would get the workspaceId from useParams
  // For the core package, we'll just use the provided workspaceId or default
  const actualWorkspaceId = props.workspaceId || DEFAULT_WORKSPACE_ID;

  return (
    <BrainstormLocalStorageContextProvider key={actualWorkspaceId} workspaceId={actualWorkspaceId} {...props} />
  );
};

export default BrainstormContextProvider;

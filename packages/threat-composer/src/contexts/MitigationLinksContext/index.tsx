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
import { useMitigationLinksContext } from './context';
import MitigationLinksLocalStateContextProvider from './components/LocalStateContextProvider';
import MitigationLinksLocalStorageContextProvider from './components/LocalStorageContextProvider';
import { EXAMPLE_WORKSPACE_ID } from '../../configs/constants';
import { MitigationLinksContextProviderProps } from './types';

const MitigationLinksContextProvider: FC<PropsWithChildren<MitigationLinksContextProviderProps>> = (props) => {
  return props.workspaceId === EXAMPLE_WORKSPACE_ID ?
    (<MitigationLinksLocalStateContextProvider {...props} />) :
    (<MitigationLinksLocalStorageContextProvider {...props} />);
};

export default MitigationLinksContextProvider;

export {
  useMitigationLinksContext,
};

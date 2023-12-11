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
import MitigationLinksLocalStateContextProvider from './components/LocalStateContextProvider';
import MitigationLinksLocalStorageContextProvider from './components/LocalStorageContextProvider';
import { useMitigationLinksContext } from './context';
import { MitigationLinksContextProviderProps } from './types';
import { STORAGE_LOCAL_STATE } from '../../configs';
import useWorkspaceStorage from '../../hooks/useWorkspaceStorage';

const MitigationLinksContextProvider: FC<PropsWithChildren<MitigationLinksContextProviderProps>> = (props) => {
  const { storageType, value } = useWorkspaceStorage(props.workspaceId);

  return storageType === STORAGE_LOCAL_STATE ?
    (<MitigationLinksLocalStateContextProvider
      key={props.workspaceId}
      initialValue={value?.mitigationLinks}
      {...props} />) :
    (<MitigationLinksLocalStorageContextProvider key={props.workspaceId} {...props} />);
};

export default MitigationLinksContextProvider;

export {
  useMitigationLinksContext,
};

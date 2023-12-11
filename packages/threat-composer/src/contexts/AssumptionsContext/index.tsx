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
import AssumptionsLocalStateContextProvider from './components/LocalStateContextProvider';
import AssumptionsLocalStorageContextProvider from './components/LocalStorageContextProvider';
import { useAssumptionsContext } from './context';
import { AssumptionsContextProviderProps } from './types';
import { STORAGE_LOCAL_STATE } from '../../configs';
import useWorkspaceStorage from '../../hooks/useWorkspaceStorage';

const AssumptionsContextProvider: FC<PropsWithChildren<AssumptionsContextProviderProps>> = (props) => {
  const { storageType, value } = useWorkspaceStorage(props.workspaceId);

  return storageType === STORAGE_LOCAL_STATE ?
    (<AssumptionsLocalStateContextProvider
      key={props.workspaceId}
      initialValue={value?.assumptions}
      {...props} />) :
    (<AssumptionsLocalStorageContextProvider key={props.workspaceId} {...props} />);
};

export default AssumptionsContextProvider;

export {
  useAssumptionsContext,
};

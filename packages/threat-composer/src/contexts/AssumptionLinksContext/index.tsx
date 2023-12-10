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
import AssumptionLinksLocalStateContextProvider from './components/LocalStateContextProvider';
import AssumptionLinksLocalStorageContextProvider from './components/LocalStorageContextProvider';
import { useAssumptionLinksContext } from './context';
import { AssumptionLinksContextProviderProps } from './types';
import { STORAGE_LOCAL_STATE } from '../../configs';
import useWorkspaceStorage from '../../hooks/useWorkspaceStorage';

const AssumptionLinksContextProvider: FC<PropsWithChildren<AssumptionLinksContextProviderProps>> = (props) => {
  const { storageType, value } = useWorkspaceStorage(props.workspaceId);

  return storageType === STORAGE_LOCAL_STATE ?
    (<AssumptionLinksLocalStateContextProvider
      key={props.workspaceId}
      initialValue={value?.assumptionLinks}
      {...props} />)
    : (<AssumptionLinksLocalStorageContextProvider key={props.workspaceId} {...props} />);
};

export default AssumptionLinksContextProvider;

export {
  useAssumptionLinksContext,
};

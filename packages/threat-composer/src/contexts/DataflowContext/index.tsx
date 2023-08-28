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
import DataflowLocalStateContextProvider from './components/LocalStateContextProvider';
import DataflowLocalStorageContextProvider from './components/LocalStorageContextProvider';
import { useDataflowInfoContext } from './context';
import { DataflowContextProviderProps } from './types';
import { EXAMPLE_WORKSPACE_ID } from '../../configs/constants';
import { useExampleContext } from '../ExampleContext';

const DataflowContextProvider: FC<PropsWithChildren<DataflowContextProviderProps>> = (props) => {
  const { dataflow } = useExampleContext();

  return props.workspaceId === EXAMPLE_WORKSPACE_ID ?
    (<DataflowLocalStateContextProvider initialValue={dataflow} {...props} />) :
    (<DataflowLocalStorageContextProvider {...props} />);
};

export default DataflowContextProvider;

export {
  useDataflowInfoContext,
};

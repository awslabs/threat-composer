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
import { FC, PropsWithChildren, useCallback } from 'react';
import { DataExchangeFormat } from '../../../../customTypes';
import setLocalStorageKey from '../../../../utils/setLocalStorageKey';
import { getLocalStorageKey as getApplicationInfoLocalStorageKey } from '../../../ApplicationContext/components/LocalStorageContextProvider';
import { getLocalStorageKey as getArchitectureInfoLocalStorageKey } from '../../../ArchitectureContext/components/LocalStorageContextProvider';
import { getLocalStorageKey as getAssumptionLinksLocalStorageKey } from '../../../AssumptionLinksContext/components/LocalStorageContextProvider';
import { getLocalStorageKey as getAssumptionsListLocalStorageKey } from '../../../AssumptionsContext/components/LocalStorageContextProvider';
import { getLocalStorageKey as getDataflowInfoLocalStorageKey } from '../../../DataflowContext/components/LocalStorageContextProvider';
import { getLocalStorageKey as getMitigationLinksLocalStorageKey } from '../../../MitigationLinksContext/components/LocalStorageContextProvider';
import { getLocalStorageKey as getMitigationsLocalStorageKey } from '../../../MitigationsContext/components/LocalStorageContextProvider';
import { getLocalStorageKey as getThreatsLocalStorageKey } from '../../../ThreatsContext/components/LocalStorageContextProvider';
import { CrossWorkspaceContext } from '../../context';


const CrossWorkspaceLocalStorageContextProvider: FC<PropsWithChildren<{}>> = ({
  children,
}) => {
  const handleCloneWorkspaceData = useCallback(async (targetWorkspaceId: string, data: DataExchangeFormat) => {
    data.applicationInfo && setLocalStorageKey(getApplicationInfoLocalStorageKey(targetWorkspaceId), data.applicationInfo);
    data.architecture && setLocalStorageKey(getArchitectureInfoLocalStorageKey(targetWorkspaceId), data.architecture);
    data.dataflow && setLocalStorageKey(getDataflowInfoLocalStorageKey(targetWorkspaceId), data.dataflow);
    data.assumptions && setLocalStorageKey(getAssumptionsListLocalStorageKey(targetWorkspaceId), data.assumptions);
    data.threats && setLocalStorageKey(getThreatsLocalStorageKey(targetWorkspaceId), data.threats);
    data.mitigations && setLocalStorageKey(getMitigationsLocalStorageKey(targetWorkspaceId), data.mitigations);
    data.assumptionLinks && setLocalStorageKey(getAssumptionLinksLocalStorageKey(targetWorkspaceId), data.assumptionLinks);
    data.mitigationLinks && setLocalStorageKey(getMitigationLinksLocalStorageKey(targetWorkspaceId), data.mitigationLinks);
  }, []);

  return (<CrossWorkspaceContext.Provider value={{
    cloneWorkspaceData: handleCloneWorkspaceData,
  }}>
    {children}
  </CrossWorkspaceContext.Provider>);
};

export default CrossWorkspaceLocalStorageContextProvider;


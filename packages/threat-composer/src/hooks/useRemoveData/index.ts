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
import { useCallback } from 'react';
import { useWorkspacesContext } from '../../contexts';
import { useApplicationInfoContext } from '../../contexts/ApplicationContext';
import { useArchitectureInfoContext } from '../../contexts/ArchitectureContext';
import { useAssumptionLinksContext } from '../../contexts/AssumptionLinksContext';
import { useAssumptionsContext } from '../../contexts/AssumptionsContext';
import { useBrainstormContext } from '../../contexts/BrainstormContext';
import { useDataflowInfoContext } from '../../contexts/DataflowContext';
import { useGlobalSetupContext } from '../../contexts/GlobalSetupContext';
import { useMitigationLinksContext } from '../../contexts/MitigationLinksContext';
import { useMitigationsContext } from '../../contexts/MitigationsContext';
import { useThreatsContext } from '../../contexts/ThreatsContext';

const useRemoveData = () => {
  const { composerMode } = useGlobalSetupContext();
  const { removeWorkspace, switchWorkspace } = useWorkspacesContext();
  const { removeApplicationInfo, onDeleteWorkspace: applicationInfoDeleteWorkspace } = useApplicationInfoContext();
  const { removeArchitectureInfo, onDeleteWorkspace: architectureInfoDeleteWorkspace } = useArchitectureInfoContext();
  const { removeDataflowInfo, onDeleteWorkspace: dataflowInfoDeleteWorkspace } = useDataflowInfoContext();
  const { removeAllAssumptions, onDeleteWorkspace: assumptionsDeleteWorkspace } = useAssumptionsContext();
  const { removeAllMitigations, onDeleteWorkspace: mitigationsDeleteWorkspace } = useMitigationsContext();
  const { removeAllStatements, onDeleteWorkspace: threatsDeleteWorkspace } = useThreatsContext();
  const { removeAllAssumptionLinks, onDeleteWorkspace: assumptionLinksDeleteWorkspace } = useAssumptionLinksContext();
  const { removeAllMitigationLinks, onDeleteWorkspace: mitigationLinksDeleteWorkspace } = useMitigationLinksContext();
  const { onDeleteWorkspace: brainstormDeleteWorkspace } = useBrainstormContext();

  const removeData = useCallback(async () => {
    if (composerMode === 'Full') {
      return Promise.all([
        removeApplicationInfo(),
        removeArchitectureInfo(),
        removeDataflowInfo(),
        removeAllAssumptions(),
        removeAllMitigations(),
        removeAllStatements(),
        removeAllAssumptionLinks(),
        removeAllMitigationLinks(),
      ]);
    }

    return removeAllStatements();
  }, [composerMode,
    removeApplicationInfo, removeArchitectureInfo, removeDataflowInfo,
    removeAllAssumptions, removeAllMitigations,
    removeAllStatements, removeAllAssumptionLinks,
    removeAllMitigationLinks]);

  const deleteWorkspace = useCallback(async (toDeleteWorkspaceId: string) => {
    if (toDeleteWorkspaceId) {
      await Promise.all([
        removeWorkspace(toDeleteWorkspaceId),
        applicationInfoDeleteWorkspace(toDeleteWorkspaceId),
        architectureInfoDeleteWorkspace(toDeleteWorkspaceId),
        threatsDeleteWorkspace(toDeleteWorkspaceId),
        dataflowInfoDeleteWorkspace(toDeleteWorkspaceId),
        assumptionsDeleteWorkspace(toDeleteWorkspaceId),
        mitigationsDeleteWorkspace(toDeleteWorkspaceId),
        assumptionLinksDeleteWorkspace(toDeleteWorkspaceId),
        mitigationLinksDeleteWorkspace(toDeleteWorkspaceId),
        brainstormDeleteWorkspace(toDeleteWorkspaceId),
      ]);

      switchWorkspace(null);
    }
  }, [
    composerMode,
    switchWorkspace,
    applicationInfoDeleteWorkspace,
    architectureInfoDeleteWorkspace,
    dataflowInfoDeleteWorkspace,
    threatsDeleteWorkspace,
    assumptionsDeleteWorkspace,
    mitigationsDeleteWorkspace,
    assumptionLinksDeleteWorkspace,
    mitigationLinksDeleteWorkspace,
    brainstormDeleteWorkspace,
  ]);

  return {
    removeData,
    deleteWorkspace,
  };
};

export default useRemoveData;

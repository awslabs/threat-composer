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
import { useApplicationInfoContext } from '../../contexts/ApplicationContext/context';
import { useArchitectureInfoContext } from '../../contexts/ArchitectureContext/context';
import { useAssumptionLinksContext } from '../../contexts/AssumptionLinksContext/context';
import { useAssumptionsContext } from '../../contexts/AssumptionsContext/context';
import { useDataflowInfoContext } from '../../contexts/DataflowContext/context';
import { useGlobalSetupContext } from '../../contexts/GlobalSetupContext/context';
import { useMitigationLinksContext } from '../../contexts/MitigationLinksContext/context';
import { useMitigationsContext } from '../../contexts/MitigationsContext/context';
import { useThreatsContext } from '../../contexts/ThreatsContext/context';
import { DataExchangeFormat, TemplateThreatStatement } from '../../customTypes';
import cleanupThreatData from '../../utils/cleanupThreatData';
import { downloadObjectAsJson } from '../../utils/downloadContent';
import getExportFileName from '../../utils/getExportFileName';
import recalculateThreatData from '../../utils/recalculateThreatData';
import sanitizeHtml from '../../utils/sanitizeHtml';
import validateData from '../../utils/validateData';

const SCHEMA_VERSION = 1.0;

export const PLACEHOLDER_EXCHANGE_DATA = {
  schema: SCHEMA_VERSION,
};

export const PLACEHOLDER_EXCHANGE_DATA_FOR_WORKSPACE = {
  id: '',
  name: '',
};

const useImportExport = () => {
  const { composerMode } = useGlobalSetupContext();
  const { currentWorkspace } = useWorkspacesContext();
  const { applicationInfo, setApplicationInfo } = useApplicationInfoContext();
  const { architectureInfo, setArchitectureInfo } = useArchitectureInfoContext();
  const { dataflowInfo, setDataflowInfo } = useDataflowInfoContext();
  const { assumptionList, setAssumptionList } = useAssumptionsContext();
  const { mitigationList, setMitigationList } = useMitigationsContext();
  const { statementList, setStatementList } = useThreatsContext();
  const { assumptionLinkList, setAssumptionLinkList } = useAssumptionLinksContext();
  const { mitigationLinkList, setMitigationLinkList } = useMitigationLinksContext();

  const getWorkspaceData = useCallback((): DataExchangeFormat => {

    const cleanedThreats = cleanupThreatData(statementList);
    if (composerMode === 'Full') {
      return {
        schema: SCHEMA_VERSION,
        applicationInfo,
        architecture: architectureInfo,
        dataflow: dataflowInfo,
        assumptions: assumptionList,
        mitigations: mitigationList,
        assumptionLinks: assumptionLinkList,
        mitigationLinks: mitigationLinkList,
        threats: cleanedThreats,
      };
    }

    return {
      schema: SCHEMA_VERSION,
      threats: cleanedThreats,
    };
  }, [composerMode, currentWorkspace, applicationInfo,
    architectureInfo, dataflowInfo,
    assumptionList, mitigationList,
    assumptionLinkList, mitigationLinkList,
    statementList]);

  const exportAll = useCallback(() => {
    const exportFileName = getExportFileName(composerMode, false, currentWorkspace);
    const exportObject = getWorkspaceData();
    downloadObjectAsJson(exportObject, exportFileName);
  }, [getWorkspaceData, currentWorkspace, composerMode]);

  const exportSelectedThreats = useCallback((selectedStatementList: TemplateThreatStatement[]) => {
    const exportFileName = getExportFileName(composerMode, true, currentWorkspace);
    downloadObjectAsJson({
      schema: SCHEMA_VERSION,
      workspace: currentWorkspace || undefined,
      threats: selectedStatementList,
    }, exportFileName);
  }, [currentWorkspace]);

  const parseImportedData = useCallback((data: any): DataExchangeFormat => {
    const parsedData = sanitizeHtml(data);

    if (Array.isArray(parsedData)) {
      // This is before schema version support
      return {
        schema: -1,
        threats: data as TemplateThreatStatement[],
      };
    }

    const validatedData = validateData(parsedData);

    if (!validatedData.success) {
      throw new Error(validatedData.error.issues.map(i => `${i.path}: ${i.message}`).join('\n'));
    }

    const importedData = validatedData.data as DataExchangeFormat;

    if (!parsedData.schema || parsedData.schema !== SCHEMA_VERSION) {
      throw new Error('Unsupported Schema version');
    }

    return importedData;
  }, []);

  const importData = useCallback(async (data: DataExchangeFormat) => {
    const calculatedThreats = recalculateThreatData(data.threats || []);

    if (data.schema > 0) {
      setApplicationInfo(data.applicationInfo || {});
      setArchitectureInfo(data.architecture || {});
      setDataflowInfo(data.dataflow || {});
      setAssumptionList(data.assumptions || []);
      setMitigationList(data.mitigations || []);
      setStatementList(calculatedThreats);
      setAssumptionLinkList(data.assumptionLinks || []);
      setMitigationLinkList(data.mitigationLinks || []);
    } else {
      // Support ListOnly mode
      setStatementList(data.threats || []);
    }
  }, [
    setApplicationInfo,
    setArchitectureInfo,
    setDataflowInfo,
    setAssumptionList,
    setMitigationList,
    setStatementList,
    setAssumptionLinkList,
    setMitigationLinkList,
  ]);

  return {
    getWorkspaceData,
    exportAll,
    exportSelectedThreats,
    parseImportedData,
    importData,
  };
};

export default useImportExport;
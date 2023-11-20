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
import { useCallback, FC, PropsWithChildren, useEffect } from 'react';
import { useWorkspacesContext } from '../../../contexts';
import { ThreatComposerNamespace } from '../../../customTypes/dataExchange';
import useExportImport, { PLACEHOLDER_EXCHANGE_DATA, PLACEHOLDER_EXCHANGE_DATA_FOR_WORKSPACE } from '../../../hooks/useExportImport';

declare global {
  interface Window { threatcomposer: ThreatComposerNamespace }
}

window.threatcomposer = {
  getWorkspaceData: () => PLACEHOLDER_EXCHANGE_DATA,
  setWorkspaceData: () => null,
  getWorkspaceMetadata: () => PLACEHOLDER_EXCHANGE_DATA_FOR_WORKSPACE,
  getWorkspaceList: () => [PLACEHOLDER_EXCHANGE_DATA_FOR_WORKSPACE],
};

/**
 * Export threat-composer functionalities via window object.
 */
const WindowExporter: FC<PropsWithChildren<{}>> = ({
  children,
}) => {
  const { getWorkspaceData, parseImportedData, importData } = useExportImport();

  useEffect(() => {

  }, []);

  const { currentWorkspace, workspaceList } = useWorkspacesContext();

  const setWorkspaceData = useCallback(((data: any) => {
    const parsedData = parseImportedData(data);
    importData(parsedData);
  }), []);

  useEffect(() => {
    window.threatcomposer.getWorkspaceData = getWorkspaceData;
  }, [getWorkspaceData]);

  useEffect(() => {
    window.threatcomposer.setWorkspaceData = setWorkspaceData;
  }, []);

  useEffect(() => {
    window.threatcomposer.getWorkspaceMetadata = () => currentWorkspace;
  }, [currentWorkspace]);

  useEffect(() => {
    window.threatcomposer.getWorkspaceList = () => workspaceList;
  }, [workspaceList]);

  // To-do: Add other exporter method here.
  // useEffect(() => {
  //   window.threatcomposer.getWorkspaceData = getWorkspaceData;
  // }, [getWorkspaceData]);

  return <>{children}</>;
};

export default WindowExporter;
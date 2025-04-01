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
import { convertToMarkdown } from '@aws/threat-composer-core';
import { useCallback, FC, PropsWithChildren, useEffect } from 'react';
import { useWorkspacesContext } from '../../../contexts';
import useExportImport, { PLACEHOLDER_EXCHANGE_DATA } from '../../../hooks/useExportImport';
import useRemoveData from '../../../hooks/useRemoveData';

/**
 * Export threat-composer functionalities via window object.
 */
const WindowExporter: FC<PropsWithChildren<{}>> = ({ children }) => {
  const { getWorkspaceData, parseImportedData, importData } = useExportImport();
  const {
    currentWorkspace,
    workspaceList,
    addWorkspace,
    switchWorkspace,
    renameWorkspace,
  } = useWorkspacesContext();
  const { deleteWorkspace } = useRemoveData();

  const setWorkspaceData = useCallback(
    async (data: any) => {
      const parsedData = parseImportedData(data || PLACEHOLDER_EXCHANGE_DATA);
      await importData(parsedData);
    },
    [importData],
  );

  const getCurrentWorkspaceDataMarkdown = useCallback(async () => {
    return convertToMarkdown(getWorkspaceData());
  }, [getWorkspaceData]);


  useEffect(() => {
    window.threatcomposer.getWorkspaceList = () => workspaceList;
  }, [workspaceList]);

  useEffect(() => {
    window.threatcomposer.getCurrentWorkspaceMetadata = () => currentWorkspace;
  }, [currentWorkspace]);

  useEffect(() => {
    window.threatcomposer.getCurrentWorkspaceData = getWorkspaceData;
  }, [getWorkspaceData]);

  useEffect(() => {
    window.threatcomposer.getCurrentWorkspaceDataMarkdown = getCurrentWorkspaceDataMarkdown;
  }, [getCurrentWorkspaceDataMarkdown]);

  useEffect(() => {
    window.threatcomposer.setCurrentWorkspaceData = setWorkspaceData;
  }, [setWorkspaceData]);

  useEffect(() => {
    window.threatcomposer.createWorkspace = addWorkspace;
  }, [addWorkspace]);

  useEffect(() => {
    window.threatcomposer.deleteWorkspace = deleteWorkspace;
  }, [deleteWorkspace]);

  useEffect(() => {
    window.threatcomposer.switchWorkspace = switchWorkspace;
  }, [switchWorkspace]);

  useEffect(() => {
    window.threatcomposer.renameWorkspace = renameWorkspace;
  }, [renameWorkspace]);

  return <>{children}</>;
};

export default WindowExporter;

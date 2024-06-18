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
import { FC, useMemo } from 'react';
import ThreatModelView, { ThreatModelViewProps } from './components/ThreatModelView';
import { APP_MODE_IDE_EXTENSION } from '../../../configs/appMode';
import { useGlobalSetupContext, useWorkspacesContext } from '../../../contexts';
import { DataExchangeFormat, ViewNavigationEvent } from '../../../customTypes';
import useImportExport from '../../../hooks/useExportImport';
import useHasContent from '../../../hooks/useHasContent';
import getExportFileName from '../../../utils/getExportFileName';

export interface ThreatModelProps extends ViewNavigationEvent {
  onPrintButtonClick?: (data: DataExchangeFormat) => void;
  isPreview?: boolean;
  convertToDocx?: ThreatModelViewProps['convertToDocx'];
}

const ThreatModel: FC<ThreatModelProps> = ({
  onPrintButtonClick,
  ...props
}) => {
  const { getWorkspaceData } = useImportExport();
  const { composerMode, appMode } = useGlobalSetupContext();
  const [_, hasContentDetails] = useHasContent();
  const { currentWorkspace } = useWorkspacesContext();

  const downloadFileName = useMemo(() => {
    return getExportFileName(composerMode, false, currentWorkspace);
  }, [composerMode, currentWorkspace]);

  return <ThreatModelView
    {...props}
    onPrintButtonClick={() => onPrintButtonClick?.(getWorkspaceData())}
    showPrintDownloadButtons={appMode !== APP_MODE_IDE_EXTENSION}
    composerMode={composerMode}
    data={getWorkspaceData()}
    downloadFileName={downloadFileName}
    hasContentDetails={hasContentDetails}
    onApplicationInfoView={props.onApplicationInfoView}
    onArchitectureView={props.onArchitectureView}
    onDataflowView={props.onDataflowView}
    onAssumptionListView={props.onAssumptionListView}
    onThreatListView={props.onThreatListView}
    onMitigationListView={props.onMitigationListView}
  />;
};

export default ThreatModel;
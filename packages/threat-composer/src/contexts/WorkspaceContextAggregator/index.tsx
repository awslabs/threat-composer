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
import WindowExporter from '../../components/generic/WindowExporter';
import { ComposerMode, DataExchangeFormat, ViewNavigationEvent } from '../../customTypes';
import ApplicationInfoContextProvider from '../ApplicationContext';
import ArchitectureInfoContextProvider from '../ArchitectureContext';
import AssumptionLinksContextProvider from '../AssumptionLinksContext';
import AssumptionsContextProvider from '../AssumptionsContext';
import DataflowInfoContextProvider from '../DataflowContext';
import GlobalSetupContextProvider from '../GlobalSetupContext';
import MitigationLinksContextProvider from '../MitigationLinksContext';
import MitigationPacksContextProvider from '../MitigationPacksContext';
import MitigationsContextProvider from '../MitigationsContext';
import ThreatPacksContextProvider from '../ThreatPacksContext';
import ThreatsContextProvider from '../ThreatsContext';

export interface WorkspaceContextAggregatorProps extends ViewNavigationEvent {
  workspaceId: string | null;
  composerMode?: ComposerMode;
  requiredGlobalSetupContext?: boolean;
  onPreview?: (content: DataExchangeFormat) => void;
  onPreviewClose?: () => void;
  onImported?: () => void;
}

const WorkspaceContextInnerAggregator: FC<PropsWithChildren<WorkspaceContextAggregatorProps>> = ({
  children,
  workspaceId,
}) => {
  return (
    <ThreatsContextProvider
      workspaceId={workspaceId || null}
    >
      <MitigationsContextProvider workspaceId={workspaceId}>
        <AssumptionsContextProvider workspaceId={workspaceId}>
          <MitigationLinksContextProvider workspaceId={workspaceId}>
            <AssumptionLinksContextProvider workspaceId={workspaceId}>
              <ApplicationInfoContextProvider workspaceId={workspaceId}>
                <ArchitectureInfoContextProvider workspaceId={workspaceId}>
                  <DataflowInfoContextProvider workspaceId={workspaceId}>
                    <ThreatPacksContextProvider workspaceId={workspaceId}>
                      <MitigationPacksContextProvider workspaceId={workspaceId}>
                        <WindowExporter>
                          {children}
                        </WindowExporter>
                      </MitigationPacksContextProvider>
                    </ThreatPacksContextProvider>
                  </DataflowInfoContextProvider>
                </ArchitectureInfoContextProvider>
              </ApplicationInfoContextProvider>
            </AssumptionLinksContextProvider>
          </MitigationLinksContextProvider>
        </AssumptionsContextProvider >
      </MitigationsContextProvider>
    </ThreatsContextProvider>
  );
};

const WorkspaceContextAggregator: FC<PropsWithChildren<WorkspaceContextAggregatorProps>> = ({
  children,
  workspaceId,
  composerMode,
  requiredGlobalSetupContext = true,
  onPreview,
  onPreviewClose,
  onImported,
  ...rest
}) => {
  return requiredGlobalSetupContext ? (
    <GlobalSetupContextProvider composerMode={composerMode}>
      <WorkspaceContextInnerAggregator workspaceId={workspaceId} {...rest}>
        {children}
      </WorkspaceContextInnerAggregator>
    </GlobalSetupContextProvider>
  ) : (
    <WorkspaceContextInnerAggregator workspaceId={workspaceId} {...rest}>
      {children}
    </WorkspaceContextInnerAggregator>
  );
};

export default WorkspaceContextAggregator;
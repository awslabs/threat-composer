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
import { ComposerMode } from '../../customTypes';
import AssumptionLinksContextProvider from '../AssumptionLinksContext';
import AssumptionsContextProvider from '../AssumptionsContext';
import GlobalSetupContextProvider from '../GlobalSetupContext';
import MitigationLinksContextProvider from '../MitigationLinksContext';
import MitigationsContextProvider from '../MitigationsContext';
import ThreatsContextProvider from '../ThreatsContext';

export interface WorkspaceContextAggregatorProps {
  workspaceId: string | null;
  composerMode?: ComposerMode;
  requiredGlobalSetupContext?: boolean;
}

const WorkspaceContextInnerAggregator: FC<PropsWithChildren<WorkspaceContextAggregatorProps>> = ({
  children,
  workspaceId,
}) => {
  return (
    <AssumptionsContextProvider workspaceId={workspaceId}>
      <AssumptionLinksContextProvider workspaceId={workspaceId}>
        <MitigationsContextProvider workspaceId={workspaceId}>
          <MitigationLinksContextProvider workspaceId={workspaceId}>
            <ThreatsContextProvider workspaceId={workspaceId || null}>
              {children}
            </ThreatsContextProvider>
          </MitigationLinksContextProvider>
        </MitigationsContextProvider>
      </AssumptionLinksContextProvider>
    </AssumptionsContextProvider>
  );
};

const WorkspaceContextAggregator: FC<PropsWithChildren<WorkspaceContextAggregatorProps>> = ({
  children,
  workspaceId,
  composerMode,
  requiredGlobalSetupContext = true,
}) => {
  return requiredGlobalSetupContext ? (
    <GlobalSetupContextProvider composerMode={composerMode}>
      <WorkspaceContextInnerAggregator workspaceId={workspaceId}>
        {children}
      </WorkspaceContextInnerAggregator>
    </GlobalSetupContextProvider>
  ) : (
    <WorkspaceContextInnerAggregator workspaceId={workspaceId}>
      {children}
    </WorkspaceContextInnerAggregator>
  );
};

export default WorkspaceContextAggregator;
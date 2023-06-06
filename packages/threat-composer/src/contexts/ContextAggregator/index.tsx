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
import { ComposerMode, DataExchangeFormat } from '../../customTypes';
import GlobalSetupContextProvider from '../GlobalSetupContext';
import WorkspaceContextAggregator, { WorkspaceContextAggregatorProps } from '../WorkspaceContextAggregator';
import WorkspacesContextProvider, { WorkspacesContextProviderProps } from '../WorkspacesContext';

export interface ContextAggregatorProps {
  composerMode?: ComposerMode;
  onWorkspaceChanged?: WorkspacesContextProviderProps['onWorkspaceChanged'];
  onThreatEditorView?: WorkspaceContextAggregatorProps['onThreatEditorView'];
  onThreatListView?: WorkspaceContextAggregatorProps['onThreatListView'];
  onPreview?: (content: DataExchangeFormat) => void;
  onPreviewClose?: () => void;
  onImported?: () => void;
}

const ContextAggregator: FC<PropsWithChildren<ContextAggregatorProps>> = ({
  children,
  onWorkspaceChanged,
  composerMode = 'ThreatsOnly',
  onThreatEditorView,
  onThreatListView,
  onPreview,
  onPreviewClose,
  onImported,
}) => {
  return (
    <GlobalSetupContextProvider
      onPreview={onPreview}
      onPreviewClose={onPreviewClose}
      onImported={onImported}
      composerMode={composerMode}>
      <WorkspacesContextProvider onWorkspaceChanged={onWorkspaceChanged}>
        {(workspaceId) => (<WorkspaceContextAggregator
          workspaceId={workspaceId}
          requiredGlobalSetupContext={false}
          onThreatEditorView={onThreatEditorView}
          onThreatListView={onThreatListView}
        >
          {children}
        </WorkspaceContextAggregator>)}
      </WorkspacesContextProvider>
    </GlobalSetupContextProvider>);
};

export default ContextAggregator;
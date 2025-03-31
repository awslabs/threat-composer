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
import { DataExchangeFormat, Workspace } from '@aws/threat-composer-core';
import { EventHandler } from '../utils/EventController';

export interface ThreatComposerNamespace {
  getWorkspaceList?: () => Workspace[];
  getCurrentWorkspaceMetadata?: () => Workspace | null;
  getCurrentWorkspaceData?: () => DataExchangeFormat;
  getCurrentWorkspaceDataMarkdown?: () => Promise<string>;
  stringifyWorkspaceData: (arg0: any) => string;
  setCurrentWorkspaceData?: (arg0: DataExchangeFormat) => Promise<void>;
  switchWorkspace?: (id: string | null) => void;
  createWorkspace?: (workspaceName: string,
    storageType?: Workspace['storageType'],
    metadata?: Workspace['metadata']) => Promise<Workspace>;
  deleteWorkspace?: (id: string) => Promise<void>;
  renameWorkspace?: (id: string, newWorkspaceName: string) => Promise<void>;
  dispatchEvent: (event: CustomEvent) => void;
  addEventListener: (eventName: string, eventHandler: EventHandler) => void;
  applyDensity?: (density?: string) => void;
  applyTheme?: (theme?: string) => void;
}

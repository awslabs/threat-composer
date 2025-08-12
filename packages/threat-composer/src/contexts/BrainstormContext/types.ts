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

import { BrainstormData, BrainstormItem } from '../../customTypes/brainstorm';

// Define the context-specific brainstorm data with required arrays for internal use
export interface BrainstormContextData {
  assumptions: BrainstormItem[];
  threatSources: BrainstormItem[];
  threatPrerequisites: BrainstormItem[];
  threatActions: BrainstormItem[];
  threatImpacts: BrainstormItem[];
  assets: BrainstormItem[];
  mitigations: BrainstormItem[];
}

// Define the context API
export interface BrainstormContextApi {
  brainstormData: BrainstormContextData;
  addItem: (type: keyof BrainstormContextData, content: string) => void;
  updateItem: (type: keyof BrainstormContextData, id: string, content: string) => void;
  removeItem: (type: keyof BrainstormContextData, id: string) => void;
  setBrainstormData: (data: BrainstormData) => void;
  onDeleteWorkspace: (workspaceId: string) => Promise<void>;
}

// Define the context provider props
export interface BrainstormContextProviderProps {
  workspaceId: string | null;
}

// Export the schema types for external use
export type { BrainstormData, BrainstormItem };

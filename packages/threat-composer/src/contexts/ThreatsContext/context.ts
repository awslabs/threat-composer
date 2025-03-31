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
import { PerFieldExample, TemplateThreatStatement } from '@aws/threat-composer-core';
import { useContext, createContext } from 'react';
import threatStatementExamplesData from '../../data/threatStatementExamples.json';
export type View = 'list' | 'editor';

export type PerFieldExamplesType = {
  threat_source: string[];
  prerequisites: PerFieldExample[];
  threat_action: PerFieldExample[];
  threat_impact: PerFieldExample[];
  impacted_goal: string[][];
  impacted_assets: string[];
}

export const DEFAULT_PER_FIELD_EXAMPLES = {
  threat_source: [],
  prerequisites: [],
  threat_action: [],
  threat_impact: [],
  impacted_goal: [],
  impacted_assets: [],
};

export interface ThreatsContextApi {
  view: View;
  editingStatement: TemplateThreatStatement | null;
  statementList: TemplateThreatStatement[];
  setStatementList: (statements: TemplateThreatStatement[]) => void;
  threatStatementExamples: TemplateThreatStatement[];
  perFieldExamples: PerFieldExamplesType;
  previousInputs: PerFieldExamplesType;
  setView: React.Dispatch<React.SetStateAction<View>>;
  setEditingStatement: React.Dispatch<React.SetStateAction<TemplateThreatStatement | null>>;
  addStatement: (idToCopy?: string) => void;
  removeStatement: (id: string) => void;
  editStatement: (id: string) => void;
  saveStatement: (statement: TemplateThreatStatement) => void;
  removeAllStatements: () => Promise<void>;
  onDeleteWorkspace: (workspaceId: string) => Promise<void>;
}

const initialState: ThreatsContextApi = {
  view: 'list',
  editingStatement: null,
  statementList: [],
  setStatementList: () => { },
  threatStatementExamples: threatStatementExamplesData,
  perFieldExamples: DEFAULT_PER_FIELD_EXAMPLES,
  previousInputs: DEFAULT_PER_FIELD_EXAMPLES,
  setView: () => { },
  setEditingStatement: () => { },
  addStatement: () => { },
  removeStatement: () => { },
  saveStatement: () => { },
  editStatement: () => { },
  removeAllStatements: () => Promise.resolve(),
  onDeleteWorkspace: () => Promise.resolve(),
};

export const ThreatsContext = createContext<ThreatsContextApi>(initialState);

export const useThreatsContext = () => useContext(ThreatsContext);
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
import { FC, PropsWithChildren, useCallback, useState } from 'react';
import { ThreatsContext } from '../../context';
import { TemplateThreatStatement } from '../../../../customTypes';
import { useGlobalSetupContext } from '../../../GlobalSetupContext/context';
import useThreatExamples from '../../hooks/useThreatExamples';
import useThreats from '../../hooks/useThreats';
import { ThreatsContextProviderProps } from '../../types';

const ThreatsContextProvider: FC<PropsWithChildren<ThreatsContextProviderProps>> = ({
  children,
  onThreatListView,
  onThreatEditorView,
}) => {
  const [editingStatement,
    setEditingStatement] = useState<TemplateThreatStatement | null>(null);

  const [statementList,
    setStatementList] = useState<TemplateThreatStatement[]>([]);

  const { composerMode } = useGlobalSetupContext();

  const {
    threatStatementExamples,
    perFieldExamples,
    previousInputs,
  } = useThreatExamples(statementList);

  const {
    view,
    setView,
    handleAddStatement,
    handlRemoveStatement,
    handleEditStatement,
    handleSaveStatement,
  } = useThreats(
    composerMode,
    statementList,
    setStatementList,
    editingStatement,
    setEditingStatement,
    onThreatEditorView,
  )

  const handleRemoveAllStatements = useCallback(async () => {
    setStatementList([]);
    setEditingStatement(null);
  }, []);

  const handleDeleteWorkspace = useCallback(async (_workspaceId: string) => {
    setStatementList([]);
    setEditingStatement(null);
  }, []);

  return (<ThreatsContext.Provider value={{
    view,
    editingStatement,
    statementList,
    setStatementList,
    threatStatementExamples: threatStatementExamples as TemplateThreatStatement[],
    perFieldExamples,
    previousInputs,
    setView,
    setEditingStatement,
    addStatement: handleAddStatement,
    removeStatement: handlRemoveStatement,
    editStatement: handleEditStatement,
    saveStatement: handleSaveStatement,
    removeAllStatements: handleRemoveAllStatements,
    onDeleteWorkspace: handleDeleteWorkspace,
    onThreatListView,
    onThreatEditorView,
  }}>
    {children}
  </ThreatsContext.Provider>);
};

export default ThreatsContextProvider;
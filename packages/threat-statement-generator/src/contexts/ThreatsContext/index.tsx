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
import { FC, PropsWithChildren, useState, useCallback, useEffect, useMemo } from 'react';
import useLocalStorageState from 'use-local-storage-state';
import { v4 as uuidV4 } from 'uuid';
import { PerFieldExamplesType, ThreatsContext, DEFAULT_PER_FIELD_EXAMPLES, useThreatsContext } from './context';
import { DEFAULT_NEW_ENTITY_ID } from '../../configs';
import { LOCAL_STORAGE_KEY_STATEMENT_LIST, LOCAL_STORAGE_KEY_EDITING_STATEMENT } from '../../configs/localStorageKeys';
import { PerFieldExample, TemplateThreatStatement } from '../../customTypes';
import threatStatementExamplesData from '../../data/threatStatementExamples.json';
import ThreatsMigration from '../../migrations/ThreatsMigration';
import removeLocalStorageKey from '../../utils/removeLocalStorageKey';
import renderThreatStatement from '../../utils/renderThreatStatement';
import { useGlobalSetupContext } from '../GlobalSetupContext/context';

export type View = 'list' | 'editor';

export interface ThreatsContextProviderProps {
  workspaceId: string | null;
  onThreatListView?: () => void;
  onThreatEditorView?: (threatId: string) => void;
}

const getLocalStorageKey = (workspaceId: string | null) => {
  if (workspaceId) {
    return `${LOCAL_STORAGE_KEY_STATEMENT_LIST}_${workspaceId}`;
  }

  return LOCAL_STORAGE_KEY_STATEMENT_LIST;
};

const addNewValueToStringArray = (arr: string[], newValue?: string) => {
  return newValue && !arr.includes(newValue) ? [...arr, newValue] : arr;
};

const addNewValueArrayToStringArrayArray = (arr: string[][], newValue?: string[]) => {
  if (newValue && newValue.length > 0) {
    if (!arr.find(strArr => strArr.length === newValue.length && newValue.every(v => strArr.includes(v)))) {
      return [...arr, newValue];
    }
  }

  return arr;
};

const addNewValueArrayToStringArray = (arr: string[], newValue?: string[]) => {
  if (newValue && newValue.length > 0) {
    return [...arr, ...newValue.filter(v => !arr.includes(v))];
  }

  return arr;
};

const addNewValueToPerFieldExampleArray = (
  arr: PerFieldExample[],
  field: keyof TemplateThreatStatement,
  newValue: TemplateThreatStatement,
  fromId: number) => {
  return newValue[field] ? [
    ...arr, {
      example: newValue[field] as string,
      fromId,
      stride: [],
    },
  ] : arr;
};

const ThreatsContextProvider: FC<PropsWithChildren<ThreatsContextProviderProps>> = ({
  children,
  workspaceId: currentWorkspaceId,
  onThreatListView,
  onThreatEditorView,
}) => {
  const [view, setView] = useState<View>('list');

  const [editingStatement,
    setEditingStatement,
    { removeItem: removeEditingStatement }] = useLocalStorageState<TemplateThreatStatement | null>(LOCAL_STORAGE_KEY_EDITING_STATEMENT, {
    defaultValue: null,
  });

  const [statementList,
    setStatementList,
    { removeItem: removeStatementList }] = useLocalStorageState<TemplateThreatStatement[]>(getLocalStorageKey(currentWorkspaceId), {
    defaultValue: [],
  });

  const { composerMode, hasVisitBefore } = useGlobalSetupContext();

  const threatStatementExamples = useMemo(() => {
    return threatStatementExamplesData.map(e => {
      const { statement, displayedStatement } = renderThreatStatement(e);
      return {
        ...e,
        statement,
        displayedStatement,
      };
    });
  }, []);

  const perFieldExamples: PerFieldExamplesType = useMemo(() => {
    return threatStatementExamples.reduce((agg: PerFieldExamplesType, st: TemplateThreatStatement, index: number) => {
      return {
        threat_source: addNewValueToStringArray(agg.threat_source, st.threatSource),
        prerequisites: addNewValueToPerFieldExampleArray(agg.prerequisites, 'prerequisites', st, index),
        threat_action: addNewValueToPerFieldExampleArray(agg.threat_action, 'threatAction', st, index),
        threat_impact: addNewValueToPerFieldExampleArray(agg.threat_impact, 'threatImpact', st, index),
        impacted_goal: addNewValueArrayToStringArrayArray(agg.impacted_goal, st.impactedGoal),
        impacted_assets: addNewValueArrayToStringArray(agg.impacted_assets, st.impactedAssets),
      };
    }, DEFAULT_PER_FIELD_EXAMPLES);
  }, [threatStatementExamples]);

  const previousInputs: PerFieldExamplesType = useMemo(() => {
    return statementList
      .map(ts => ts as TemplateThreatStatement)
      .reduce((agg: PerFieldExamplesType, st: TemplateThreatStatement, index: number) => {
        return {
          threat_source: addNewValueToStringArray(agg.threat_source, st.threatSource),
          prerequisites: addNewValueToPerFieldExampleArray(agg.prerequisites, 'prerequisites', st, index),
          threat_action: addNewValueToPerFieldExampleArray(agg.threat_action, 'threatAction', st, index),
          threat_impact: addNewValueToPerFieldExampleArray(agg.threat_impact, 'threatImpact', st, index),
          impacted_goal: addNewValueArrayToStringArrayArray(agg.impacted_goal, st.impactedGoal),
          impacted_assets: addNewValueArrayToStringArray(agg.impacted_assets, st.impactedAssets),
        };
      }, DEFAULT_PER_FIELD_EXAMPLES);
  }, [statementList]);

  const handleAddStatement = useCallback((idToCopy?: string) => {
    if (idToCopy) {
      const copiedStatement = statementList.find(st => st.id === idToCopy);
      if (copiedStatement) {
        const { id: _id, displayOrder, tags, metadata, ...rest } = copiedStatement;
        const newStatement = {
          ...rest,
          id: uuidV4(),
          numericId: -1,
        };

        setEditingStatement(newStatement);
        onThreatEditorView?.(newStatement.id);
      }
    } else {
      const newStatement: TemplateThreatStatement = {
        id: uuidV4(),
        numericId: -1,
      };
      setEditingStatement(newStatement);
      onThreatEditorView?.(newStatement.id);
    }
  }, [statementList, setEditingStatement, onThreatEditorView]);

  const handlRemoveStatement = useCallback((id: string) => {
    setStatementList((prevList) => prevList.filter(x => x.id !== id));
  }, [setStatementList]);

  const handleEditStatement = useCallback((id: string) => {
    const statement = statementList.find(s => s.id === id);
    if (statement) {
      setEditingStatement(statement as TemplateThreatStatement);
    }
  }, [statementList]);

  const handleSaveStatement = useCallback((statement: TemplateThreatStatement) => {
    setStatementList((prevList) => {
      let numericId = statement.numericId;

      if (numericId === -1) {
        const maxId = prevList.reduce((max: number, cur: TemplateThreatStatement) => {

          if (cur.numericId > max) {
            return cur.numericId;
          }

          return max;
        }, 0);
        numericId = maxId + 1;
      }

      let updatedStatement: TemplateThreatStatement = {
        ...statement,
        numericId,
        displayOrder: numericId,
      };

      updatedStatement = {
        ...updatedStatement,
        threatSource: updatedStatement.threatSource?.trim(),
        prerequisites: updatedStatement.prerequisites?.trim(),
        threatAction: updatedStatement.threatAction?.trim(),
        threatImpact: updatedStatement.threatImpact?.trim(),
      };

      const foundIndex = prevList.findIndex(st => st.id === statement.id);
      if (foundIndex >= 0) {
        return [...prevList.slice(0, foundIndex), updatedStatement, ...prevList.slice(foundIndex + 1)];
      }

      return [...prevList, updatedStatement];
    });
  }, [setStatementList]);

  const handleRemoveAllStatements = useCallback(async () => {
    removeStatementList();
    removeEditingStatement();
  }, [removeEditingStatement, removeStatementList]);

  const handleDeleteWorkspace = useCallback(async (workspaceId: string) => {
    setEditingStatement(null);
    window.setTimeout(() => {
      // tio delete after the workspace is switched. Otherwise the default value is set again.
      removeLocalStorageKey(getLocalStorageKey(workspaceId));
    }, 1000);
  }, [removeStatementList, removeEditingStatement]);

  useEffect(() => {
    if (composerMode === 'ThreatsOnly') {
      if (editingStatement) {
        setView('editor');
      } else {
        setView('list');
      }
    } else if (composerMode === 'Full') {
      if (editingStatement) {
        if (editingStatement.numericId === -1) {
          onThreatEditorView?.(DEFAULT_NEW_ENTITY_ID);
        } else {
          onThreatEditorView?.(editingStatement.id);
        }
      } else {
        onThreatListView?.();
      }
    }
  }, [composerMode, editingStatement, setView]);

  const lenStatementList = statementList.length;
  const editingStatementExist = !!editingStatement;

  useEffect(() => {
    if ((composerMode === 'EditorOnly' && !editingStatementExist)
      || (composerMode === 'ThreatsOnly'
        && !hasVisitBefore
        && !editingStatementExist
        && lenStatementList === 0 && !currentWorkspaceId)) {
      handleAddStatement();
    }
  }, [composerMode, editingStatementExist, hasVisitBefore, lenStatementList, currentWorkspaceId]);

  return (<ThreatsContext.Provider value={{
    view,
    editingStatement,
    statementList,
    setStatementList,
    threatStatementExamples,
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
  }}>
    <ThreatsMigration>
      {children}
    </ThreatsMigration>
  </ThreatsContext.Provider>);
};

export default ThreatsContextProvider;

export {
  useThreatsContext,
};
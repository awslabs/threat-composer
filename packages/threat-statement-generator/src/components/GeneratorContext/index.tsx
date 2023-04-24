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
import { FC, useContext, createContext, PropsWithChildren, useState, useCallback, useEffect, useMemo } from 'react';
import useLocalStorageState from 'use-local-storage-state';
import { PerFieldExample, TemplateThreatStatement, Workspace } from '../../customTypes';
import threatStatementExamplesData from '../../data/threatStatementExamples.json';
import downloadObjectAsJson from '../../utils/downloadObjectAsJson';
import renderThreatStatement from '../../utils/renderThreatStatement';
import InfoModal from '../InfoModal';

export type View = 'list' | 'editor';
export const LOCAL_STORAGE_KEY_NEW_VISIT_FLAG = 'ThreatStatementGenerator.newVisitFlag';
export const LOCAL_STORAGE_KEY_EDITING_STATEMENT = 'ThreatStatementGenerator.editingStatement';
export const LOCAL_STORAGE_KEY_STATEMENT_LIST = 'ThreatStatementGenerator.threatStatementList';
export const EXPORT_FILE_NAME = 'threatStatementList';

export type PER_FIELD_EXAMPLES_TYPE = {
  threat_source: string[];
  prerequisites: PerFieldExample[];
  threat_action: PerFieldExample[];
  threat_impact: PerFieldExample[];
  impacted_goal: string[][];
  impacted_assets: string[];
}

export interface GeneratorContextProviderProps {
  workspace: Workspace | null;
}

export interface GeneratorContextApi {
  view: View;
  editingStatement: TemplateThreatStatement | null;
  statementList: TemplateThreatStatement[];
  threatStatementExamples: TemplateThreatStatement[];
  perFieldExamples: PER_FIELD_EXAMPLES_TYPE;
  previousInputs: PER_FIELD_EXAMPLES_TYPE;
  setView: React.Dispatch<React.SetStateAction<View>>;
  setEditingStatement: React.Dispatch<React.SetStateAction<TemplateThreatStatement | null>>;
  addStatement: (idToCopy?: number) => void;
  removeStatement: (id: number) => void;
  editStatement: (id: number) => void;
  saveStatement: (statement: TemplateThreatStatement) => void;
  importStatementList: (newStatements: TemplateThreatStatement[]) => void;
  exportStatementList: (exportedStatementList: TemplateThreatStatement[]) => void;
  showInfoModal: () => void;
  removeAllStatements: () => void;
}

const DEFAULT_PER_FIELD_EXAMPLES = {
  threat_source: [],
  prerequisites: [],
  threat_action: [],
  threat_impact: [],
  impacted_goal: [],
  impacted_assets: [],
};

const getLocalStorageKey = (workspace: Workspace | null) => {
  if (workspace) {
    return `${LOCAL_STORAGE_KEY_STATEMENT_LIST}_${workspace.id}`;
  }

  return LOCAL_STORAGE_KEY_STATEMENT_LIST;
};

const initialState: GeneratorContextApi = {
  view: 'list',
  editingStatement: null,
  statementList: [],
  threatStatementExamples: threatStatementExamplesData,
  perFieldExamples: DEFAULT_PER_FIELD_EXAMPLES,
  previousInputs: DEFAULT_PER_FIELD_EXAMPLES,
  setView: () => { },
  setEditingStatement: () => { },
  addStatement: () => { },
  removeStatement: () => { },
  saveStatement: () => { },
  editStatement: () => { },
  importStatementList: () => { },
  exportStatementList: () => { },
  removeAllStatements: () => { },
  showInfoModal: () => { },
};

const GeneratorContext = createContext<GeneratorContextApi>(initialState);

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

const GeneratorContextProvider: FC<PropsWithChildren<GeneratorContextProviderProps>> = ({
  children,
  workspace: currentWorkspace,
}) => {
  const [view, setView] = useState<View>('list');

  const [editingStatement, setEditingStatement] = useLocalStorageState<TemplateThreatStatement | null>(LOCAL_STORAGE_KEY_EDITING_STATEMENT, {
    defaultValue: null,
  });

  const [statementList, setStatementList] = useLocalStorageState<TemplateThreatStatement[]>(getLocalStorageKey(currentWorkspace), {
    defaultValue: [],
  });

  const [hasVisitBefore, setHasVisitBefore] = useLocalStorageState<boolean>(LOCAL_STORAGE_KEY_NEW_VISIT_FLAG, {
    defaultValue: false,
  });

  const [infoModalVisible, setInfoModalVisible] = useState(false);

  const threatStatementExamples = useMemo(() => {
    return threatStatementExamplesData.map(e => ({
      ...e,
      statement: renderThreatStatement(e).statement,
    }));
  }, []);

  const perFieldExamples: PER_FIELD_EXAMPLES_TYPE = useMemo(() => {
    return threatStatementExamples.reduce((agg: PER_FIELD_EXAMPLES_TYPE, st: TemplateThreatStatement, index: number) => {
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

  const previousInputs: PER_FIELD_EXAMPLES_TYPE = useMemo(() => {
    return statementList
      .map(ts => ts as TemplateThreatStatement)
      .reduce((agg: PER_FIELD_EXAMPLES_TYPE, st: TemplateThreatStatement, index: number) => {
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

  const handleAddStatement = useCallback((idToCopy?: number) => {
    if (idToCopy) {
      const copiedStatement = statementList.find(st => st.id === idToCopy);
      if (copiedStatement) {
        const { id: _id, ...rest } = copiedStatement;
        const newStatement = {
          id: -1,
          ...rest,
        };

        setEditingStatement(newStatement);
      }
    } else {
      const newStatement: TemplateThreatStatement = {
        id: -1,
      };
      setEditingStatement(newStatement);
    }
  }, [statementList, setEditingStatement]);

  const handlRemoveStatement = useCallback((id: number) => {
    setStatementList((prevList) => prevList.filter(x => x.id !== id));
  }, [setStatementList]);

  const handleEditStatement = useCallback((id: number) => {
    const statement = statementList.find(s => s.id === id);
    if (statement) {
      setEditingStatement(statement as TemplateThreatStatement);
    }
  }, [statementList]);

  const handleSaveStatement = useCallback((statement: TemplateThreatStatement) => {
    setStatementList((prevList) => {
      let id = statement.id;

      if (id === -1) {
        const maxId = prevList.reduce((max: number, cur: TemplateThreatStatement) => {

          if (cur.id > max) {
            return cur.id;
          }

          return max;
        }, 0);
        id = maxId + 1;
      }

      let updatedStatement: TemplateThreatStatement = {
        ...statement,
        id: id,
        displayOrder: id,
      };

      updatedStatement = {
        ...updatedStatement,
        threatSource: updatedStatement.threatSource?.trim(),
        prerequisites: updatedStatement.prerequisites?.trim(),
        threatAction: updatedStatement.threatAction?.trim(),
        threatImpact: updatedStatement.threatImpact?.trim(),
      };

      if (statement.id > 0) {
        const foundIndex = prevList.findIndex(st => st.id === statement.id);
        if (foundIndex >= 0) {
          return [...prevList.slice(0, foundIndex), updatedStatement, ...prevList.slice(foundIndex + 1)];
        }
      }

      return [...prevList, updatedStatement];
    });
  }, [setStatementList]);

  const handleImportStatementList = useCallback((newStatements: TemplateThreatStatement[]) => {
    setStatementList(newStatements);
  }, [setStatementList]);

  const handleExportStatementList = useCallback((exportedStatementList: TemplateThreatStatement[]) => {
    downloadObjectAsJson(exportedStatementList, EXPORT_FILE_NAME);
  }, []);

  const handleRemoveAllStatements = useCallback(() => {
    setStatementList([]);
  }, []);

  useEffect(() => {
    if (!hasVisitBefore) {
      handleAddStatement();
      window.setTimeout(() => setHasVisitBefore(true), 1000);
    }
  }, [handleAddStatement]);

  useEffect(() => {
    if (editingStatement) {
      setView('editor');
    } else {
      setView('list');
    }
  }, [editingStatement, setView]);

  useEffect(() => {
    if (!hasVisitBefore) {
      setInfoModalVisible(true);
    }
  }, [hasVisitBefore]);

  return (<GeneratorContext.Provider value={{
    view,
    editingStatement,
    statementList,
    threatStatementExamples,
    perFieldExamples,
    previousInputs,
    setView,
    setEditingStatement,
    showInfoModal: () => setInfoModalVisible(true),
    addStatement: handleAddStatement,
    removeStatement: handlRemoveStatement,
    editStatement: handleEditStatement,
    saveStatement: handleSaveStatement,
    importStatementList: handleImportStatementList,
    exportStatementList: handleExportStatementList,
    removeAllStatements: handleRemoveAllStatements,
  }}>
    {children}
    {infoModalVisible && <InfoModal
      visible={infoModalVisible}
      setVisible={setInfoModalVisible}
    />}
  </GeneratorContext.Provider>);
};

export const useGeneratorContext = () => useContext(GeneratorContext);
export default GeneratorContextProvider;

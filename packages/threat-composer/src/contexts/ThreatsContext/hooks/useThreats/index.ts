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
import { useCallback, useEffect, useState } from 'react';
import { v4 as uuidV4 } from 'uuid';
import { ComposerMode, TemplateThreatStatement } from '../../../../customTypes';
import { View } from '../../types';

const useThreats = (
  composerMode: ComposerMode,
  statementList: TemplateThreatStatement[],
  setStatementList: React.Dispatch<React.SetStateAction<TemplateThreatStatement[]>>,
  editingStatement: TemplateThreatStatement | null,
  setEditingStatement: React.Dispatch<React.SetStateAction<TemplateThreatStatement | null>>,
) => {
  const [view, setView] = useState<View>('list');

  const handleAddStatement = useCallback((idToCopy?: string) => {
    if (composerMode !== 'Full') { // If Full mode, the value will be set via the route in the app.
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
        }
      } else {
        const newStatement: TemplateThreatStatement = {
          id: uuidV4(),
          numericId: -1,
        };
        setEditingStatement(newStatement);
      }
    }
  }, [statementList, setEditingStatement]);

  const handlRemoveStatement = useCallback((id: string) => {
    setStatementList((prevList) => prevList.filter(x => x.id !== id));
  }, [setStatementList]);

  const handleEditStatement = useCallback((id: string) => {
    if (composerMode !== 'Full') { // If Full mode, the value will be set via the route in the app.
      const statement = statementList.find(s => s.id === id);
      if (statement) {
        setEditingStatement(statement as TemplateThreatStatement);
      }
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

  useEffect(() => {
    if (composerMode === 'ThreatsOnly') {
      if (editingStatement) {
        setView('editor');
      } else {
        setView('list');
      }
    }
  }, [composerMode, editingStatement, setView]);

  const lenStatementList = statementList.length;
  const editingStatementExist = !!editingStatement;

  return {
    view,
    setView,
    handleAddStatement,
    handlRemoveStatement,
    handleEditStatement,
    handleSaveStatement,
    lenStatementList,
    editingStatementExist,
  };
};

export default useThreats;

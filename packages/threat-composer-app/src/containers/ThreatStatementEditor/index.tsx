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
import {
  ThreatStatementEditor as ThreatStatementEditorComponent,
  useThreatsContext,
  getThreatFromThreatPacksThreat,
  TemplateThreatStatement,
  useThreatPacksContext,
  DEFAULT_NEW_ENTITY_ID,
  ThreatPack,
  getNewThreatStatement,
} from '@aws/threat-composer';
import { useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { ROUTE_THREAT_EDITOR } from '../../config/routes';
import useNavigateView from '../../hooks/useNavigationView';
import isMemoryRouterUsed from '../../utils/isMemoryRouterUsed';

const ThreatStatementEditor = () => {
  const { threatId } = useParams();
  const location = useLocation();
  const handleNavigateView = useNavigateView();

  const [idToCopy] = useState(() => {
    if (isMemoryRouterUsed()) {
      return location.state?.idToCopy;
    }

    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('idToCopy');
  });

  const [{
    threatPackId,
    threatPackThreatId,
  }] = useState(() => {
    if (isMemoryRouterUsed()) {
      return {
        threatPackId: location.state?.threatPackId,
        threatPackThreatId: location.state?.threatPackThreatId,
      };
    }

    const urlParams = new URLSearchParams(window.location.search);
    return {
      threatPackId: urlParams.get('threatPackId'),
      threatPackThreatId: urlParams.get('threatPackThreatId'),
    };
  });

  const { statementList, setEditingStatement } = useThreatsContext();
  const { threatPacks } = useThreatPacksContext();

  const [editingStatement] = useState(() => {
    let statement: TemplateThreatStatement = getNewThreatStatement();

    if (threatId === DEFAULT_NEW_ENTITY_ID && idToCopy) {
      // Create new threat from copying an existing threat
      const copiedStatement = statementList.find((st: TemplateThreatStatement) => st.id === idToCopy);
      if (copiedStatement) {
        const { id: _id, displayOrder, tags, metadata, ...rest } = copiedStatement;
        statement = {
          ...rest,
          ...statement,
        };
      }
    } else if (threatId === DEFAULT_NEW_ENTITY_ID && threatPackId && threatPackThreatId) {
      // Create new threat from threat pack threat
      const threatPack = threatPacks.find((tp: ThreatPack) => tp.id === threatPackId);
      if (threatPack) {
        const threatPackThreat = threatPack.threats?.find((t: TemplateThreatStatement) => t.id === threatPackThreatId);
        if (threatPackThreat) {
          statement = getThreatFromThreatPacksThreat(threatPackId, threatPackThreat);
        }
      }
    } else if (threatId) {
      // Editing existing threat
      const threatStatement = statementList.find((st: TemplateThreatStatement) => st.id === threatId);
      if (threatStatement) {
        statement = threatStatement;
      }
    }

    return statement;
  });

  useEffect(() => {
    setEditingStatement(editingStatement);
  }, [editingStatement]);

  return <ThreatStatementEditorComponent onThreatListView={() => handleNavigateView(ROUTE_THREAT_EDITOR)} />;
};

export default ThreatStatementEditor;
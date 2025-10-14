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
  useThreatsContext,
  getThreatFromThreatPacksThreat,
  TemplateThreatStatement,
  useThreatPacksContext,
  DEFAULT_NEW_ENTITY_ID,
  ThreatPack,
  getNewThreatStatement,
  ThreatFieldTypes,
  ThreatStatementEditor as ThreatStatementEditorComponent,
} from '@aws/threat-composer';
import { useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { ROUTE_THREAT_LIST } from '../../config/routes';
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
    fieldKey,
    fieldValue,
  }] = useState(() => {
    if (isMemoryRouterUsed()) {
      return {
        threatPackId: location.state?.threatPackId,
        threatPackThreatId: location.state?.threatPackThreatId,
        fieldKey: location.state?.fieldKey,
        fieldValue: location.state?.fieldValue,
      };
    }

    const urlParams = new URLSearchParams(window.location.search);
    return {
      threatPackId: urlParams.get('threatPackId'),
      threatPackThreatId: urlParams.get('threatPackThreatId'),
      fieldKey: urlParams.get('fieldKey'),
      fieldValue: urlParams.get('fieldValue'),
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
      } else if (fieldKey && fieldValue) {
        // Create a new threat with the specified field value
        statement = {
          ...statement,
          id: threatId,
          [fieldKey]: fieldKey === 'impactedAssets' ? [fieldValue] : fieldValue,
        };
      }
    }

    return statement;
  });

  useEffect(() => {
    setEditingStatement(editingStatement);
  }, [editingStatement]);

  // Pass the field key to focus on the appropriate field
  const [initialEditorField] = useState<ThreatFieldTypes | undefined>(() => {
    if (fieldKey) {
      // Map the field key to the editor field type
      switch (fieldKey) {
        case 'threatSource':
          return 'threat_source';
        case 'prerequisites':
          return 'prerequisites';
        case 'threatImpact':
          return 'threat_impact';
        case 'impactedAssets':
          return 'impacted_assets';
        case 'threatAction':
          return 'threat_action';
        default:
          return undefined;
      }
    }
    return undefined;
  });

  return <ThreatStatementEditorComponent
    onThreatListView={() => handleNavigateView(ROUTE_THREAT_LIST)}
    threatPackId={threatPackId}
    threatPackThreatId={threatPackThreatId}
    initialEditorField={initialEditorField}
  />;
};

export default ThreatStatementEditor;

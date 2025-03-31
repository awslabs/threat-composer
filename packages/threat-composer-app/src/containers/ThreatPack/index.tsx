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
import { ThreatPackComponent, DEFAULT_WORKSPACE_ID, DEFAULT_NEW_ENTITY_ID } from '@aws/threat-composer';
import { TemplateThreatStatement } from '@aws/threat-composer-core';
import { FC, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ROUTE_THREAT_EDITOR } from '../../config/routes';
import generateUrl from '../../utils/generateUrl';

const ThreatPack: FC = () => {
  const { threatPackId, workspaceId } = useParams();
  const [searchParms] = useSearchParams();
  const navigate = useNavigate();

  const handleEditThreat = useCallback((selectedThreatPackId: string, threat: TemplateThreatStatement) => {
    const url = generateUrl(ROUTE_THREAT_EDITOR, searchParms,
      workspaceId || DEFAULT_WORKSPACE_ID,
      DEFAULT_NEW_ENTITY_ID,
      undefined, {
        threatPackId: selectedThreatPackId,
        threatPackThreatId: threat.id,
      });
    navigate(url, {
      state: {
        threatPackId: selectedThreatPackId,
        threatPackThreatId: threat.id,
      },
    });
  }, [workspaceId, searchParms]);

  if (!threatPackId) {
    return null;
  }

  return (<ThreatPackComponent
    threatPackId={threatPackId}
    onEditThreat={handleEditThreat} />);
};

export default ThreatPack;
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
import { AttackTrees as AttackTreesComponent, AttackTreeNode } from '@aws/threat-composer';
import { FC, useCallback } from 'react';
import { ROUTE_MITIGATION_LIST, ROUTE_THREAT_EDITOR } from '../../config/routes';
import useNavigateView from '../../hooks/useNavigationView';

const AttackTrees: FC = () => {
  const navigateView = useNavigateView();

  const handleNodeSelect = useCallback(
    (node: AttackTreeNode) => {
      // react-router 7 returns a promise from navigate; nothing here depends on
      // the transition completing, so it is explicitly not awaited.
      if (node.type === 'threat' && node.entityId) {
        void navigateView(ROUTE_THREAT_EDITOR, node.entityId);
        return;
      }

      if (node.type === 'mitigation' && node.entityId) {
        void navigateView(
          ROUTE_MITIGATION_LIST,
          undefined,
          undefined,
          undefined,
          { state: { scrollToEntityId: node.entityId } },
        );
      }
    },
    [navigateView],
  );

  return <AttackTreesComponent onNodeSelect={handleNodeSelect} />;
};

export default AttackTrees;

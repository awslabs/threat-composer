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
import { AttackTrees as AttackTreesComponent, AttackTreeNode, AttackTreeRootDimension } from '@aws/threat-composer';
import { FC, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ROUTE_ASSUMPTION_LIST, ROUTE_MITIGATION_LIST, ROUTE_THREAT_EDITOR } from '../../config/routes';
import {
  SEARCH_PARAM_ATTACK_TREE_ROOT,
  SEARCH_PARAM_ATTACK_TREE_ROOT_TAG,
  SEARCH_PARAM_ATTACK_TREE_UNTAGGED,
} from '../../config/searchParams';
import useNavigateView from '../../hooks/useNavigationView';

const ROOT_DIMENSIONS: AttackTreeRootDimension[] = ['impactedAsset', 'impactedGoal', 'threatSource', 'stride', 'tag'];

const DEFAULT_ROOT_DIMENSION: AttackTreeRootDimension = 'impactedAsset';

const parseRootDimension = (value: string | null): AttackTreeRootDimension =>
  ROOT_DIMENSIONS.find((dimension) => dimension === value) || DEFAULT_ROOT_DIMENSION;

/**
 * Hosts the attack trees and keeps the tree root, the root tags and the Untagged
 * toggle in the URL, for example
 * `?root=tag&rootTag=exfiltrate-pii&rootTag=exfiltrate-pii/via-api&untagged=1`.
 * Defaults are left out of the URL. Updates replace the history entry so that
 * tweaking the view does not fill the back stack.
 */
const AttackTrees: FC = () => {
  const navigateView = useNavigateView();
  const [searchParams, setSearchParams] = useSearchParams();

  const rootDimension = parseRootDimension(searchParams.get(SEARCH_PARAM_ATTACK_TREE_ROOT));
  const rootTagParams = searchParams.getAll(SEARCH_PARAM_ATTACK_TREE_ROOT_TAG).join('\n');
  const rootTags = useMemo(() => (rootTagParams ? rootTagParams.split('\n') : []), [rootTagParams]);
  const includeUntagged = searchParams.get(SEARCH_PARAM_ATTACK_TREE_UNTAGGED) === '1';

  const updateSearchParams = useCallback(
    (update: (params: URLSearchParams) => void) => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          update(next);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const handleRootDimensionChange = useCallback(
    (dimension: AttackTreeRootDimension) =>
      updateSearchParams((params) => {
        if (dimension === DEFAULT_ROOT_DIMENSION) {
          params.delete(SEARCH_PARAM_ATTACK_TREE_ROOT);
        } else {
          params.set(SEARCH_PARAM_ATTACK_TREE_ROOT, dimension);
        }
      }),
    [updateSearchParams],
  );

  const handleRootTagsChange = useCallback(
    (tags: string[]) =>
      updateSearchParams((params) => {
        params.delete(SEARCH_PARAM_ATTACK_TREE_ROOT_TAG);
        tags.forEach((tag) => params.append(SEARCH_PARAM_ATTACK_TREE_ROOT_TAG, tag));
      }),
    [updateSearchParams],
  );

  const handleIncludeUntaggedChange = useCallback(
    (value: boolean) =>
      updateSearchParams((params) => {
        if (value) {
          params.set(SEARCH_PARAM_ATTACK_TREE_UNTAGGED, '1');
        } else {
          params.delete(SEARCH_PARAM_ATTACK_TREE_UNTAGGED);
        }
      }),
    [updateSearchParams],
  );

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
        return;
      }

      if (node.type === 'assumption' && node.entityId) {
        void navigateView(ROUTE_ASSUMPTION_LIST);
      }
    },
    [navigateView],
  );

  return (
    <AttackTreesComponent
      onNodeSelect={handleNodeSelect}
      rootDimension={rootDimension}
      onRootDimensionChange={handleRootDimensionChange}
      rootTags={rootTags}
      onRootTagsChange={handleRootTagsChange}
      includeUntagged={includeUntagged}
      onIncludeUntaggedChange={handleIncludeUntaggedChange}
    />
  );
};

export default AttackTrees;

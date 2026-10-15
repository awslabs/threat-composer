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
  LEVEL_HIGH,
  LEVEL_LOW,
  LEVEL_MEDIUM,
  METADATA_KEY_PRIORITY,
  METADATA_KEY_STRIDE,
} from '../../configs';
import {
  Assumption,
  AssumptionLink,
  AttackTreeFilter,
  AttackTreeNode,
  AttackTreeRiskLevel,
  AttackTreeRootDimension,
  AttackTreeTagRootOption,
  Mitigation,
  MitigationLink,
  TemplateThreatStatement,
} from '../../customTypes';
import STRIDE from '../../data/stride';
import getMitreAttackTechniques from '../getMitreAttackTechniques';
import sortStrideValues from '../sortStrideValues';
import standardizeNumericId from '../standardizeNumericId';

export const DEFAULT_ATTACK_TREE_ROOT_DIMENSION: AttackTreeRootDimension =
  'impactedAsset';

export const RISK_LEVEL_NOT_SET: AttackTreeRiskLevel = 'Not set';

/**
 * Risk levels in ascending order of severity, used when rolling up the risk of a
 * subtree to its parent.
 */
export const RISK_LEVELS_ASCENDING: AttackTreeRiskLevel[] = [
  RISK_LEVEL_NOT_SET,
  'Low',
  'Medium',
  'High',
];

const ROOT_FALLBACK_LABEL: { [key in AttackTreeRootDimension]: string } = {
  impactedAsset: 'Unspecified asset',
  impactedGoal: 'Unspecified security objective',
  threatSource: 'Unspecified threat source',
  stride: 'No STRIDE category',
  tag: 'Untagged',
};

const ROOT_LABEL_PREFIX: { [key in AttackTreeRootDimension]: string } = {
  impactedAsset: 'Compromise',
  impactedGoal: 'Reduce',
  threatSource: 'Attack by',
  stride: 'Attack category',
  tag: 'Tag',
};

/**
 * Separates the segments of a nested tag. `exfiltrate-pii/via-api` is the
 * `via-api` sub-goal of the `exfiltrate-pii` tag.
 */
export const TAG_PATH_SEPARATOR = '/';

/**
 * Root label of the tree holding the threats that carry no tag at all.
 */
export const UNTAGGED_ROOT_LABEL = 'Untagged';

const UNSPECIFIED_IMPACT_LABEL = 'Unspecified impact';

const STRIDE_LABEL_BY_VALUE = STRIDE.reduce(
  (all: { [value: string]: string }, cur) => {
    all[cur.value] = cur.label;
    return all;
  },
  {},
);

export interface BuildAttackTreesParams {
  threats: TemplateThreatStatement[];
  mitigations?: Mitigation[];
  mitigationLinks?: MitigationLink[];
  assumptions?: Assumption[];
  assumptionLinks?: AssumptionLink[];
  filter?: AttackTreeFilter;
}

/**
 * A tag split into its nested segments. key is the case folded, slash joined
 * form used for matching; segments keep the casing as written.
 */
interface TagPath {
  key: string;
  segments: string[];
}

/**
 * Splits a tag into its nested segments, trimming each segment and dropping empty
 * ones, so `Exfiltrate PII / via API/` and `exfiltrate pii/via api` share a key.
 * Returns undefined for a tag that has no non-empty segment.
 */
export const parseTagPath = (tag: string): TagPath | undefined => {
  const segments = (tag || '')
    .split(TAG_PATH_SEPARATOR)
    .map((segment) => segment.replace(/\s+/g, ' ').trim())
    .filter((segment) => segment.length > 0);

  if (segments.length === 0) {
    return undefined;
  }

  return {
    key: segments.map((segment) => segment.toLowerCase()).join(TAG_PATH_SEPARATOR),
    segments,
  };
};

const isSameOrNestedKey = (key: string, ancestorKey: string) =>
  key === ancestorKey || key.startsWith(`${ancestorKey}${TAG_PATH_SEPARATOR}`);

export interface GetAttackTreeTagRootOptionsParams {
  threats: TemplateThreatStatement[];
  mitigations?: Mitigation[];
  assumptions?: Assumption[];
}

/**
 * Lists every tag a tree can be rooted at: each tag used by a threat, mitigation
 * or assumption, plus every prefix of a nested tag, so `exfiltrate-pii/via-api`
 * yields both `exfiltrate-pii` and `exfiltrate-pii/via-api`.
 *
 * Tags differing only in case or whitespace around separators are merged and keep
 * the spelling first seen. Options are ordered by group and then by path, so a
 * nested tag follows its parent.
 */
export const getAttackTreeTagRootOptions = ({
  threats,
  mitigations = [],
  assumptions = [],
}: GetAttackTreeTagRootOptionsParams): AttackTreeTagRootOption[] => {
  const options = new Map<string, { segments: string[]; entityIds: Set<string> }>();

  [...threats, ...mitigations, ...assumptions].forEach((entity) => {
    (entity.tags || []).forEach((tag) => {
      const path = parseTagPath(tag);
      if (!path) {
        return;
      }

      // Walk the prefixes shortest first, so a nested option reuses the spelling
      // already chosen for its parent and stays in the same group.
      let parentSegments: string[] = [];
      path.segments.forEach((segment, index) => {
        const key = path.segments
          .slice(0, index + 1)
          .map((s) => s.toLowerCase())
          .join(TAG_PATH_SEPARATOR);
        let option = options.get(key);
        if (!option) {
          option = { segments: [...parentSegments, segment], entityIds: new Set<string>() };
          options.set(key, option);
        }
        option.entityIds.add(entity.id);
        parentSegments = option.segments;
      });
    });
  });

  return Array.from(options.values())
    .map(({ segments, entityIds }) => ({
      value: segments.join(TAG_PATH_SEPARATOR),
      group: segments[0],
      depth: segments.length,
      entityCount: entityIds.size,
    }))
    .sort((a, b) => {
      const groupDelta = a.group.toLowerCase().localeCompare(b.group.toLowerCase());
      return groupDelta !== 0 ? groupDelta : a.value.toLowerCase().localeCompare(b.value.toLowerCase());
    });
};

/**
 * A group of threats that share a normalised label. Used for both tree roots and
 * impact nodes so that values differing only in case, whitespace or trailing
 * punctuation collapse into a single node rather than producing duplicates.
 */
interface LabelGroup {
  label: string;
  threats: TemplateThreatStatement[];
  threatIds: Set<string>;
}

/**
 * Normalises a label for grouping: case folded, whitespace collapsed and trailing
 * punctuation removed. "Customer  Database." and "customer database" group together.
 */
export const normalizeGroupKey = (label: string) =>
  label
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.,;:]+$/, '')
    .toLowerCase();

const asStringArray = (value?: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === 'string');
  }

  return typeof value === 'string' ? [value] : [];
};

const getThreatMetadataValue = (threat: TemplateThreatStatement, key: string) =>
  threat.metadata?.find((m) => m.key === key)?.value;

const nonEmpty = (values?: (string | undefined)[]) =>
  (values || [])
    .map((v) => v?.replace(/\s+/g, ' ').trim())
    .filter((v): v is string => !!v && v.length > 0);

/**
 * Maps the Priority metadata of a threat onto a risk level.
 */
export const getRiskLevel = (priority?: string): AttackTreeRiskLevel => {
  switch (priority) {
    case LEVEL_HIGH:
      return 'High';
    case LEVEL_MEDIUM:
      return 'Medium';
    case LEVEL_LOW:
      return 'Low';
    default:
      return RISK_LEVEL_NOT_SET;
  }
};

/**
 * Rolls a set of risk levels up to the highest one present.
 */
export const getHighestRiskLevel = (
  levels: AttackTreeRiskLevel[],
): AttackTreeRiskLevel =>
  levels.reduce(
    (highest, level) =>
      RISK_LEVELS_ASCENDING.indexOf(level) >
      RISK_LEVELS_ASCENDING.indexOf(highest)
        ? level
        : highest,
    RISK_LEVEL_NOT_SET,
  );

/**
 * Orders trees by risk, most severe first: High, then Medium, then Low, then Not
 * set, so that the trees needing attention are read first.
 *
 * Trees of equal risk keep the order they were built in, which is alphabetical by
 * label for the derived dimensions and the authored order for kill chains and
 * custom trees. The index tiebreak makes that explicit rather than relying on the
 * sort being stable.
 */
export const sortAttackTreesByRiskLevel = (
  trees: AttackTreeNode[],
): AttackTreeNode[] =>
  trees
    .map((tree, index) => ({ tree, index }))
    .sort((a, b) => {
      const severityDelta =
        RISK_LEVELS_ASCENDING.indexOf(b.tree.riskLevel || RISK_LEVEL_NOT_SET) -
        RISK_LEVELS_ASCENDING.indexOf(a.tree.riskLevel || RISK_LEVEL_NOT_SET);

      return severityDelta !== 0 ? severityDelta : a.index - b.index;
    })
    .map(({ tree }) => tree);

const getRootLabels = (
  threat: TemplateThreatStatement,
  dimension: AttackTreeRootDimension,
): string[] => {
  let labels: string[] = [];

  switch (dimension) {
    case 'impactedGoal':
      labels = nonEmpty(threat.impactedGoal);
      break;
    case 'threatSource':
      labels = nonEmpty([threat.threatSource]);
      break;
    case 'stride':
      labels = nonEmpty(
        sortStrideValues(
          asStringArray(getThreatMetadataValue(threat, METADATA_KEY_STRIDE)),
        ).map((value) => STRIDE_LABEL_BY_VALUE[value] || value),
      );
      break;
    case 'impactedAsset':
    default:
      labels = nonEmpty(threat.impactedAssets);
      break;
  }

  return labels.length > 0 ? labels : [ROOT_FALLBACK_LABEL[dimension]];
};

const getThreatLabel = (threat: TemplateThreatStatement) =>
  threat.threatAction?.trim() ||
  threat.statement?.trim() ||
  'Threat without a statement';

const matchesText = (
  searchText: string,
  threat: TemplateThreatStatement,
  linkedMitigations: Mitigation[],
) => {
  const haystack = [
    threat.statement,
    threat.threatSource,
    threat.prerequisites,
    threat.threatAction,
    threat.threatImpact,
    ...(threat.impactedGoal || []),
    ...(threat.impactedAssets || []),
    ...(threat.tags || []),
    ...linkedMitigations.map((m) => m.content),
    ...linkedMitigations.flatMap((m) => m.tags || []),
  ]
    .filter((v): v is string => !!v)
    .join('\n')
    .toLowerCase();

  return haystack.includes(searchText.toLowerCase());
};

/**
 * Adds a threat to the group identified by the normalised form of label, creating
 * the group on first use. A threat is never added to the same group twice, so a
 * threat listing an asset more than once in different casing appears once.
 */
const addToGroup = (
  groups: Map<string, LabelGroup>,
  label: string,
  threat: TemplateThreatStatement,
) => {
  const key = normalizeGroupKey(label);
  let group = groups.get(key);

  if (!group) {
    group = { label, threats: [], threatIds: new Set<string>() };
    groups.set(key, group);
  }

  if (group.threatIds.has(threat.id)) {
    return;
  }

  group.threatIds.add(threat.id);
  group.threats.push(threat);
};

const sortGroups = (groups: Map<string, LabelGroup>) =>
  Array.from(groups.values()).sort((a, b) =>
    a.label.toLowerCase().localeCompare(b.label.toLowerCase()),
  );

/**
 * The threats that survived filtering, together with the mitigations that should
 * be rendered beneath each of them.
 */
interface ThreatNodeContext {
  includeMitigations: boolean;
  mitigationsToRender: { [threatId: string]: Mitigation[] };
  includeAssumptions: boolean;
  assumptionsByLinkedId: { [linkedId: string]: Assumption[] };
}

const createAssumptionNodes = (parentNodeId: string, assumptions: Assumption[] = []): AttackTreeNode[] =>
  assumptions
    .slice()
    .sort((a, b) => a.numericId - b.numericId)
    .map((assumption) => ({
      id: `${parentNodeId}-${assumption.id}`,
      label: assumption.content,
      type: 'assumption',
      entityId: assumption.id,
      displayId: `A-${standardizeNumericId(assumption.numericId)}`,
      tags: assumption.tags,
      tooltip: assumption.content,
    }));

/**
 * Builds the node for a single threat, together with its prerequisite and
 * mitigation children.
 *
 * idPrefix keeps node ids unique when the same threat appears more than once in a
 * tree, which happens when a threat is used by several kill chain stages or by
 * several branches of a custom tree.
 */
const createThreatNode = (
  threat: TemplateThreatStatement,
  { includeMitigations, mitigationsToRender, includeAssumptions, assumptionsByLinkedId }: ThreatNodeContext,
  idPrefix = 'threat',
): AttackTreeNode => {
  const nodeId = `${idPrefix}-${threat.id}`;
  const children: AttackTreeNode[] = [];
  const prerequisites = threat.prerequisites?.trim();

  if (prerequisites) {
    children.push({
      id: `${nodeId}-prerequisite`,
      label: prerequisites,
      type: 'prerequisite',
    });
  }

  if (includeMitigations) {
    (mitigationsToRender[threat.id] || [])
      .slice()
      .sort((a, b) => a.numericId - b.numericId)
      .forEach((mitigation) => {
        const mitigationNodeId = `${nodeId}-${mitigation.id}`;
        const assumptionNodes = includeAssumptions
          ? createAssumptionNodes(mitigationNodeId, assumptionsByLinkedId[mitigation.id])
          : [];

        children.push({
          id: mitigationNodeId,
          label: mitigation.content,
          type: 'mitigation',
          entityId: mitigation.id,
          displayId: `M-${standardizeNumericId(mitigation.numericId)}`,
          tags: mitigation.tags,
          status: mitigation.status,
          tooltip: mitigation.content,
          children: assumptionNodes.length > 0 ? assumptionNodes : undefined,
        });
      });
  }

  if (includeAssumptions) {
    children.push(...createAssumptionNodes(nodeId, assumptionsByLinkedId[threat.id]));
  }

  const priority = asStringArray(
    getThreatMetadataValue(threat, METADATA_KEY_PRIORITY),
  )[0];

  return {
    id: nodeId,
    label: getThreatLabel(threat),
    type: 'threat',
    operator: prerequisites ? 'AND' : 'OR',
    entityId: threat.id,
    displayId: `T-${standardizeNumericId(threat.numericId)}`,
    tags: threat.tags,
    status: threat.status,
    priority,
    riskLevel: getRiskLevel(priority),
    // Sorted so that the badges always read in canonical STRIDE order.
    stride: sortStrideValues(
      asStringArray(getThreatMetadataValue(threat, METADATA_KEY_STRIDE)),
    ),
    mitreTechniques: getMitreAttackTechniques(threat),
    tooltip: threat.statement,
    children: children.length > 0 ? children : undefined,
  } as AttackTreeNode;
};

/**
 * Counts the mitigation children of a threat node.
 */
const countMitigations = (threatNode: AttackTreeNode) =>
  (threatNode.children || []).filter((c) => c.type === 'mitigation').length;

/**
 * The impact nodes for a set of threats, together with what an aggregate parent
 * needs to roll them up.
 */
interface ImpactNodesResult {
  impactNodes: AttackTreeNode[];
  riskLevel: AttackTreeRiskLevel;
  threatIds: Set<string>;
  mitigationIds: Set<string>;
}

/**
 * Groups threats by their impact and builds one impact node per group, each
 * holding its threat nodes.
 *
 * idPrefix keeps impact ids unique within a tree. threatIdPrefix keeps threat ids
 * unique when the same threat appears under several sub-goals of one tree.
 */
const createImpactNodes = (
  threats: TemplateThreatStatement[],
  context: ThreatNodeContext,
  idPrefix: string,
  threatIdPrefix = 'threat',
): ImpactNodesResult => {
  const impactGroups = new Map<string, LabelGroup>();

  threats.forEach((threat) =>
    addToGroup(impactGroups, threat.threatImpact?.replace(/\s+/g, ' ').trim() || UNSPECIFIED_IMPACT_LABEL, threat),
  );

  const riskLevels: AttackTreeRiskLevel[] = [];
  const threatIds = new Set<string>();
  const mitigationIds = new Set<string>();

  const impactNodes: AttackTreeNode[] = sortGroups(impactGroups).map((impactGroup, impactIndex) => {
    let impactMitigationCount = 0;
    const impactRiskLevels: AttackTreeRiskLevel[] = [];

    const threatNodes: AttackTreeNode[] = impactGroup.threats
      .slice()
      .sort((a, b) => a.numericId - b.numericId)
      .map((threat) => {
        const threatNode = createThreatNode(threat, context, threatIdPrefix);
        impactMitigationCount += countMitigations(threatNode);
        impactRiskLevels.push(threatNode.riskLevel || RISK_LEVEL_NOT_SET);
        threatIds.add(threat.id);
        (threatNode.children || [])
          .filter((c) => c.type === 'mitigation' && c.entityId)
          .forEach((c) => mitigationIds.add(c.entityId as string));

        return threatNode;
      });

    const impactRiskLevel = getHighestRiskLevel(impactRiskLevels);
    riskLevels.push(impactRiskLevel);

    return {
      id: `${idPrefix}-impact-${impactIndex}`,
      label: impactGroup.label,
      type: 'impact',
      operator: 'OR',
      riskLevel: impactRiskLevel,
      metrics: {
        threats: threatNodes.length,
        mitigations: impactMitigationCount,
      },
      children: threatNodes,
    } as AttackTreeNode;
  });

  return {
    impactNodes,
    riskLevel: getHighestRiskLevel(riskLevels),
    threatIds,
    mitigationIds,
  };
};

/**
 * A node of the sub-goal trie built beneath a tag root. Each level is one segment
 * of a nested tag; threats sit at the deepest segment they are related to.
 */
interface TagTrieNode {
  label: string;
  children: Map<string, TagTrieNode>;
  threats: TemplateThreatStatement[];
  threatIds: Set<string>;
}

const createTagTrieNode = (label: string): TagTrieNode => ({
  label,
  children: new Map(),
  threats: [],
  threatIds: new Set(),
});

/**
 * Converts a sub-goal trie node into tree nodes: sub-goals first, alphabetically,
 * then the impacts of the threats placed directly at this level. Every level is an
 * OR, since reaching any sub-goal or causing any impact achieves the parent.
 */
const tagTrieToChildren = (
  trieNode: TagTrieNode,
  context: ThreatNodeContext,
  idPrefix: string,
): ImpactNodesResult & { children: AttackTreeNode[] } => {
  const riskLevels: AttackTreeRiskLevel[] = [];
  const threatIds = new Set<string>();
  const mitigationIds = new Set<string>();

  const goalNodes: AttackTreeNode[] = Array.from(trieNode.children.values())
    .sort((a, b) => a.label.toLowerCase().localeCompare(b.label.toLowerCase()))
    .map((childTrieNode, goalIndex) => {
      const goalId = `${idPrefix}-goal-${goalIndex}`;
      const result = tagTrieToChildren(childTrieNode, context, goalId);
      riskLevels.push(result.riskLevel);
      result.threatIds.forEach((id) => threatIds.add(id));
      result.mitigationIds.forEach((id) => mitigationIds.add(id));

      return {
        id: goalId,
        label: childTrieNode.label,
        type: 'goal',
        operator: 'OR',
        riskLevel: result.riskLevel,
        metrics: {
          threats: result.threatIds.size,
          mitigations: result.mitigationIds.size,
        },
        children: result.children,
      } as AttackTreeNode;
    });

  const direct = createImpactNodes(trieNode.threats, context, idPrefix, `${idPrefix}-threat`);
  riskLevels.push(direct.riskLevel);
  direct.threatIds.forEach((id) => threatIds.add(id));
  direct.mitigationIds.forEach((id) => mitigationIds.add(id));

  return {
    children: [...goalNodes, ...direct.impactNodes],
    impactNodes: direct.impactNodes,
    riskLevel: getHighestRiskLevel(riskLevels),
    threatIds,
    mitigationIds,
  };
};

/**
 * Collects the tag paths related to a threat: its own tags, the tags of the
 * mitigations rendered beneath it, and the tags of the assumptions linked to the
 * threat or to one of those mitigations. Keyed by TagPath.key.
 */
const getRelatedTagPaths = (
  threat: TemplateThreatStatement,
  linkedMitigations: Mitigation[],
  assumptionsByLinkedId: { [linkedId: string]: Assumption[] },
): Map<string, TagPath> => {
  const paths = new Map<string, TagPath>();

  const tags = [
    ...(threat.tags || []),
    ...linkedMitigations.flatMap((m) => m.tags || []),
    ...(assumptionsByLinkedId[threat.id] || []).flatMap((a) => a.tags || []),
    ...linkedMitigations.flatMap((m) => (assumptionsByLinkedId[m.id] || []).flatMap((a) => a.tags || [])),
  ];

  tags.forEach((tag) => {
    const path = parseTagPath(tag);
    if (path && !paths.has(path.key)) {
      paths.set(path.key, path);
    }
  });

  return paths;
};

/**
 * Builds one tree per selected root tag, plus an optional Untagged tree.
 *
 * A threat belongs to a tag's tree when the tag, or a tag nested beneath it, is
 * related to the threat through the threat itself, a linked mitigation, or an
 * assumption linked to either. Nested segments become sub-goal nodes, and a
 * threat sits under the deepest segment it is related to, appearing once per
 * distinct branch.
 */
const buildTagRootedTrees = (
  rootTags: string[],
  includeUntagged: boolean,
  includedThreats: TemplateThreatStatement[],
  relatedTagPathsByThreatId: { [threatId: string]: Map<string, TagPath> },
  context: ThreatNodeContext,
): AttackTreeNode[] => {
  const seenRootKeys = new Set<string>();
  const roots: { label: string; trie: TagTrieNode }[] = [];

  rootTags.forEach((rootTag) => {
    const rootPath = parseTagPath(rootTag);
    if (!rootPath || seenRootKeys.has(rootPath.key)) {
      return;
    }
    seenRootKeys.add(rootPath.key);

    const trie = createTagTrieNode(rootPath.segments.join(TAG_PATH_SEPARATOR));

    includedThreats.forEach((threat) => {
      const matching = Array.from(relatedTagPathsByThreatId[threat.id]?.values() || []).filter((path) =>
        isSameOrNestedKey(path.key, rootPath.key),
      );

      // Keep only the deepest matches: a threat tagged both `a` and `a/b` sits
      // under the `b` sub-goal, not twice.
      const deepest = matching.filter(
        (path) => !matching.some((other) => other.key !== path.key && isSameOrNestedKey(other.key, path.key)),
      );

      deepest.forEach((path) => {
        let current = trie;
        path.segments.slice(rootPath.segments.length).forEach((segment) => {
          const segmentKey = segment.toLowerCase();
          let next = current.children.get(segmentKey);
          if (!next) {
            next = createTagTrieNode(segment);
            current.children.set(segmentKey, next);
          }
          current = next;
        });

        if (!current.threatIds.has(threat.id)) {
          current.threatIds.add(threat.id);
          current.threats.push(threat);
        }
      });
    });

    roots.push({ label: `${ROOT_LABEL_PREFIX.tag}: ${trie.label}`, trie });
  });

  if (includeUntagged) {
    const trie = createTagTrieNode(UNTAGGED_ROOT_LABEL);
    includedThreats
      .filter((threat) => (relatedTagPathsByThreatId[threat.id]?.size || 0) === 0)
      .forEach((threat) => {
        trie.threatIds.add(threat.id);
        trie.threats.push(threat);
      });
    roots.push({ label: UNTAGGED_ROOT_LABEL, trie });
  }

  return roots
    .map(({ label, trie }, rootIndex) => {
      const rootId = `root-${rootIndex}`;
      const result = tagTrieToChildren(trie, context, rootId);

      return {
        id: rootId,
        label,
        type: 'root',
        operator: 'OR',
        riskLevel: result.riskLevel,
        metrics: {
          threats: result.threatIds.size,
          mitigations: result.mitigationIds.size,
        },
        children: result.children,
      } as AttackTreeNode;
    })
    .filter((tree) => (tree.children?.length || 0) > 0);
};

/**
 * Derives a set of attack trees from the threats and mitigations of a workspace.
 *
 * Each tree is rooted at an attacker goal taken from the requested dimension
 * (impacted asset by default). Beneath the root, threats are grouped by their
 * impact, and each threat carries its prerequisite, its linked mitigations and
 * its linked assumptions as children:
 *
 * ```
 * root (OR)
 *  └─ impact (OR)
 *      └─ threat (AND when it has a prerequisite)
 *          ├─ prerequisite
 *          ├─ mitigation
 *          │   └─ assumption
 *          └─ assumption
 * ```
 *
 * The tag dimension roots one tree at each of filter.rootTags instead. Nested tag
 * segments, separated by `/`, become sub-goal nodes between the root and the
 * impacts, and a threat belongs to a tag when the threat, a linked mitigation or
 * a linked assumption carries it:
 *
 * ```
 * root: Tag exfiltrate-pii (OR)
 *  ├─ goal: via-api (OR)
 *  │   └─ impact ...
 *  └─ impact ...      (threats tagged exfiltrate-pii itself)
 * ```
 *
 * Root and impact labels are de-duplicated on a normalised form of the label, so
 * values differing only by case, whitespace or trailing punctuation collapse into
 * a single node.
 *
 * Every threat node carries a risk level taken from its Priority metadata, and
 * aggregate nodes carry the highest risk level of their descendants. The trees
 * themselves are returned most severe first: High, Medium, Low, then Not set, with
 * trees of equal risk keeping their alphabetical order (or, for tag roots, the
 * order the tags were selected in).
 *
 * Every dimension is derived from the threat grammar and the existing tags, so
 * this is a pure projection of the workspace and nothing is persisted.
 *
 * Filtering semantics:
 * - threatNumbers restricts which threats appear.
 * - mitigationNumbers restricts which mitigations appear, and drops any threat
 *   left without a matching mitigation.
 * - tags keeps a threat when the threat itself, one of its linked mitigations, or
 *   an assumption linked to either carries a selected tag.
 * - searchText is matched against the threat statement fields, the threat tags
 *   and the content and tags of linked mitigations.
 */
const buildAttackTrees = ({
  threats,
  mitigations = [],
  mitigationLinks = [],
  assumptions = [],
  assumptionLinks = [],
  filter = {},
}: BuildAttackTreesParams): AttackTreeNode[] => {
  const dimension = filter.rootDimension || DEFAULT_ATTACK_TREE_ROOT_DIMENSION;
  const includeMitigations = filter.includeMitigations !== false;
  const includeAssumptions = filter.includeAssumptions !== false;
  const searchText = filter.searchText?.trim() || '';
  const selectedTags = filter.tags || [];
  const threatNumbers = filter.threatNumbers || [];
  const mitigationNumbers = filter.mitigationNumbers || [];

  const mitigationById = mitigations.reduce((all: { [id: string]: Mitigation }, cur) => {
    all[cur.id] = cur;
    return all;
  }, {});

  const mitigationsByThreatId = mitigationLinks.reduce((all: { [threatId: string]: Mitigation[] }, link) => {
    const mitigation = mitigationById[link.mitigationId];
    if (!mitigation) {
      return all;
    }

    const existing = all[link.linkedId] || [];
    // Guard against duplicate links pointing at the same mitigation.
    if (existing.some((m) => m.id === mitigation.id)) {
      return all;
    }

    all[link.linkedId] = [...existing, mitigation];
    return all;
  }, {});

  const assumptionById = assumptions.reduce((all: { [id: string]: Assumption }, cur) => {
    all[cur.id] = cur;
    return all;
  }, {});

  // Keyed by the linked threat or mitigation id. Threat and mitigation ids are
  // both UUIDs, so one map serves both link types.
  const assumptionsByLinkedId = assumptionLinks.reduce((all: { [linkedId: string]: Assumption[] }, link) => {
    const assumption = assumptionById[link.assumptionId];
    if (!assumption) {
      return all;
    }

    const existing = all[link.linkedId] || [];
    if (existing.some((a) => a.id === assumption.id)) {
      return all;
    }

    all[link.linkedId] = [...existing, assumption];
    return all;
  }, {});

  const rootGroups = new Map<string, LabelGroup>();
  const mitigationsToRender: { [threatId: string]: Mitigation[] } = {};
  const includedThreats: TemplateThreatStatement[] = [];
  const relatedTagPathsByThreatId: { [threatId: string]: Map<string, TagPath> } = {};

  threats.forEach((threat) => {
    if (threatNumbers.length > 0 && !threatNumbers.includes(threat.numericId)) {
      return;
    }

    const allLinkedMitigations = mitigationsByThreatId[threat.id] || [];
    const linkedMitigations =
      mitigationNumbers.length > 0
        ? allLinkedMitigations.filter((m) => mitigationNumbers.includes(m.numericId))
        : allLinkedMitigations;

    if (mitigationNumbers.length > 0 && linkedMitigations.length === 0) {
      return;
    }

    if (selectedTags.length > 0) {
      const linkedAssumptions = [
        ...(assumptionsByLinkedId[threat.id] || []),
        ...linkedMitigations.flatMap((m) => assumptionsByLinkedId[m.id] || []),
      ];
      const hasSelectedTag = (entity: { tags?: string[] }) => !!entity.tags?.some((t) => selectedTags.includes(t));
      if (!hasSelectedTag(threat) && !linkedMitigations.some(hasSelectedTag) && !linkedAssumptions.some(hasSelectedTag)) {
        return;
      }
    }

    if (searchText && !matchesText(searchText, threat, linkedMitigations)) {
      return;
    }

    mitigationsToRender[threat.id] = linkedMitigations;
    includedThreats.push(threat);

    if (dimension === 'tag') {
      relatedTagPathsByThreatId[threat.id] = getRelatedTagPaths(threat, linkedMitigations, assumptionsByLinkedId);
      return;
    }

    getRootLabels(threat, dimension).forEach((label) => addToGroup(rootGroups, label, threat));
  });

  const threatNodeContext: ThreatNodeContext = {
    includeMitigations,
    mitigationsToRender,
    includeAssumptions,
    assumptionsByLinkedId,
  };

  if (dimension === 'tag') {
    return sortAttackTreesByRiskLevel(
      buildTagRootedTrees(
        filter.rootTags || [],
        filter.includeUntagged === true,
        includedThreats,
        relatedTagPathsByThreatId,
        threatNodeContext,
      ),
    );
  }

  const trees = sortGroups(rootGroups).map((rootGroup, rootIndex) => {
    const rootId = `root-${rootIndex}`;
    const { impactNodes, riskLevel } = createImpactNodes(rootGroup.threats, threatNodeContext, rootId);

    return {
      id: rootId,
      label: `${ROOT_LABEL_PREFIX[dimension]}: ${rootGroup.label}`,
      type: 'root',
      operator: 'OR',
      riskLevel,
      metrics: {
        threats: impactNodes.reduce((sum, n) => sum + (n.metrics?.threats || 0), 0),
        mitigations: impactNodes.reduce((sum, n) => sum + (n.metrics?.mitigations || 0), 0),
      },
      children: impactNodes,
    } as AttackTreeNode;
  });

  return sortAttackTreesByRiskLevel(trees);
};

export default buildAttackTrees;

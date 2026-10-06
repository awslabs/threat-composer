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
  AttackTreeFilter,
  AttackTreeNode,
  AttackTreeRiskLevel,
  AttackTreeRootDimension,
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
};

const ROOT_LABEL_PREFIX: { [key in AttackTreeRootDimension]: string } = {
  impactedAsset: 'Compromise',
  impactedGoal: 'Reduce',
  threatSource: 'Attack by',
  stride: 'Attack category',
};

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
  filter?: AttackTreeFilter;
}

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
}

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
  { includeMitigations, mitigationsToRender }: ThreatNodeContext,
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
        children.push({
          id: `${nodeId}-${mitigation.id}`,
          label: mitigation.content,
          type: 'mitigation',
          entityId: mitigation.id,
          displayId: `M-${standardizeNumericId(mitigation.numericId)}`,
          tags: mitigation.tags,
          status: mitigation.status,
          tooltip: mitigation.content,
        });
      });
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
 * Derives a set of attack trees from the threats and mitigations of a workspace.
 *
 * Each tree is rooted at an attacker goal taken from the requested dimension
 * (impacted asset by default). Beneath the root, threats are grouped by their
 * impact, and each threat carries its prerequisite and its linked mitigations as
 * children:
 *
 * ```
 * root (OR)
 *  └─ impact (OR)
 *      └─ threat (AND when it has a prerequisite)
 *          ├─ prerequisite
 *          └─ mitigation
 * ```
 *
 * Root and impact labels are de-duplicated on a normalised form of the label, so
 * values differing only by case, whitespace or trailing punctuation collapse into
 * a single node.
 *
 * Every threat node carries a risk level taken from its Priority metadata, and
 * aggregate nodes carry the highest risk level of their descendants. The trees
 * themselves are returned most severe first: High, Medium, Low, then Not set, with
 * trees of equal risk keeping their alphabetical order.
 *
 * Every dimension is derived from the threat grammar, so this is a pure
 * projection of the workspace threats and nothing is persisted.
 *
 * Filtering semantics:
 * - threatNumbers restricts which threats appear.
 * - mitigationNumbers restricts which mitigations appear, and drops any threat
 *   left without a matching mitigation.
 * - tags keeps a threat when either the threat itself or one of its linked
 *   mitigations carries a selected tag.
 * - searchText is matched against the threat statement fields, the threat tags
 *   and the content and tags of linked mitigations.
 */
const buildAttackTrees = ({
  threats,
  mitigations = [],
  mitigationLinks = [],
  filter = {},
}: BuildAttackTreesParams): AttackTreeNode[] => {
  const dimension = filter.rootDimension || DEFAULT_ATTACK_TREE_ROOT_DIMENSION;
  const includeMitigations = filter.includeMitigations !== false;
  const searchText = filter.searchText?.trim() || '';
  const selectedTags = filter.tags || [];
  const threatNumbers = filter.threatNumbers || [];
  const mitigationNumbers = filter.mitigationNumbers || [];

  const mitigationById = mitigations.reduce(
    (all: { [id: string]: Mitigation }, cur) => {
      all[cur.id] = cur;
      return all;
    },
    {},
  );

  const mitigationsByThreatId = mitigationLinks.reduce(
    (all: { [threatId: string]: Mitigation[] }, link) => {
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
    },
    {},
  );

  const rootGroups = new Map<string, LabelGroup>();
  const mitigationsToRender: { [threatId: string]: Mitigation[] } = {};

  threats.forEach((threat) => {
    if (threatNumbers.length > 0 && !threatNumbers.includes(threat.numericId)) {
      return;
    }

    const allLinkedMitigations = mitigationsByThreatId[threat.id] || [];
    const linkedMitigations =
      mitigationNumbers.length > 0
        ? allLinkedMitigations.filter((m) =>
          mitigationNumbers.includes(m.numericId),
        )
        : allLinkedMitigations;

    if (mitigationNumbers.length > 0 && linkedMitigations.length === 0) {
      return;
    }

    if (selectedTags.length > 0) {
      const taggedThreat = threat.tags?.some((t) => selectedTags.includes(t));
      const taggedMitigation = linkedMitigations.some((m) =>
        m.tags?.some((t) => selectedTags.includes(t)),
      );
      if (!taggedThreat && !taggedMitigation) {
        return;
      }
    }

    if (searchText && !matchesText(searchText, threat, linkedMitigations)) {
      return;
    }

    mitigationsToRender[threat.id] = linkedMitigations;

    getRootLabels(threat, dimension).forEach((label) =>
      addToGroup(rootGroups, label, threat),
    );
  });

  const threatNodeContext: ThreatNodeContext = {
    includeMitigations,
    mitigationsToRender,
  };

  const trees = sortGroups(rootGroups).map((rootGroup, rootIndex) => {
    const impactGroups = new Map<string, LabelGroup>();

    rootGroup.threats.forEach((threat) =>
      addToGroup(
        impactGroups,
        threat.threatImpact?.replace(/\s+/g, ' ').trim() ||
          UNSPECIFIED_IMPACT_LABEL,
        threat,
      ),
    );

    let rootThreatCount = 0;
    let rootMitigationCount = 0;
    const rootRiskLevels: AttackTreeRiskLevel[] = [];

    const impactNodes: AttackTreeNode[] = sortGroups(impactGroups).map(
      (impactGroup, impactIndex) => {
        let impactMitigationCount = 0;
        const impactRiskLevels: AttackTreeRiskLevel[] = [];

        const threatNodes: AttackTreeNode[] = impactGroup.threats
          .slice()
          .sort((a, b) => a.numericId - b.numericId)
          .map((threat) => {
            const threatNode = createThreatNode(threat, threatNodeContext);
            impactMitigationCount += countMitigations(threatNode);
            impactRiskLevels.push(threatNode.riskLevel || RISK_LEVEL_NOT_SET);

            return threatNode;
          });

        rootThreatCount += threatNodes.length;
        rootMitigationCount += impactMitigationCount;

        const impactRiskLevel = getHighestRiskLevel(impactRiskLevels);
        rootRiskLevels.push(impactRiskLevel);

        return {
          id: `root-${rootIndex}-impact-${impactIndex}`,
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
      },
    );

    return {
      id: `root-${rootIndex}`,
      label: `${ROOT_LABEL_PREFIX[dimension]}: ${rootGroup.label}`,
      type: 'root',
      operator: 'OR',
      riskLevel: getHighestRiskLevel(rootRiskLevels),
      metrics: {
        threats: rootThreatCount,
        mitigations: rootMitigationCount,
      },
      children: impactNodes,
    } as AttackTreeNode;
  });

  return sortAttackTreesByRiskLevel(trees);
};

export default buildAttackTrees;

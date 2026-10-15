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

/**
 * The dimension used to derive the root (attacker goal) of each attack tree.
 *
 * Every dimension is derived from the threat grammar of the workspace, so the
 * trees are a projection of the existing threats and nothing additional is
 * persisted.
 */
export type AttackTreeRootDimension =
  | 'impactedAsset'
  | 'impactedGoal'
  | 'threatSource'
  | 'stride'
  | 'tag';

/**
 * The kind of node within an attack tree. Determines both the styling and the
 * semantics of the node.
 *
 * - root: the attacker goal the tree decomposes.
 * - goal: a sub-goal of a tag rooted tree, taken from a nested tag segment such
 *   as `via-api` in `exfiltrate-pii/via-api`.
 * - impact: an intermediate outcome that contributes to the goal.
 * - threat: a threat statement (the attacker action).
 * - prerequisite: a condition that must hold for the parent threat to be viable.
 * - mitigation: a countermeasure linked to the parent threat.
 * - assumption: an assumption linked to the parent threat, directly or through
 *   one of its mitigations.
 */
export type AttackTreeNodeType =
  | 'root'
  | 'goal'
  | 'impact'
  | 'threat'
  | 'prerequisite'
  | 'mitigation'
  | 'assumption';

/**
 * How the children of a node combine. OR means any child is sufficient, AND
 * means every child is required.
 */
export type AttackTreeNodeOperator = 'AND' | 'OR';

/**
 * The risk level of a node, derived from the Priority metadata of the threats it
 * covers. Aggregate nodes take the highest risk of their descendants.
 */
export type AttackTreeRiskLevel = 'High' | 'Medium' | 'Low' | 'Not set';

/**
 * A MITRE ATT&CK technique associated with a threat.
 */
export interface MitreAttackTechnique {
  /**
   * The technique or sub-technique id, for example T1078 or T1078.003.
   */
  id: string;
  /**
   * The technique name, when the id is one this tool knows about.
   */
  name?: string;
  /**
   * Deep link to the technique on attack.mitre.org.
   */
  url: string;
  /**
   * explicit means the id was recorded on the threat as a tag or metadata value.
   * suggested means it was inferred from keywords in the threat statement and
   * needs to be confirmed by a human.
   */
  source: 'explicit' | 'suggested';
}

export interface AttackTreeNodeMetrics {
  /**
   * Number of threat nodes within (and including) this subtree.
   */
  threats: number;
  /**
   * Number of mitigation nodes within this subtree.
   */
  mitigations: number;
}

export interface AttackTreeNode {
  /**
   * Stable, unique id of the node within its tree. Used as the React key and
   * for layout bookkeeping.
   */
  id: string;
  /**
   * The text rendered inside the node.
   */
  label: string;
  type: AttackTreeNodeType;
  /**
   * How the children of this node combine. Undefined for leaf nodes.
   */
  operator?: AttackTreeNodeOperator;
  /**
   * The id of the underlying threat or mitigation entity, when the node maps to one.
   */
  entityId?: string;
  /**
   * The human readable entity id, for example T-0003 or M-0012.
   */
  displayId?: string;
  /**
   * The tags of the underlying entity.
   */
  tags?: string[];
  /**
   * The status of the underlying entity.
   */
  status?: string;
  /**
   * The Priority metadata value of the underlying threat.
   */
  priority?: string;
  /**
   * The STRIDE metadata values of the underlying threat.
   */
  stride?: string[];
  /**
   * The risk level of this node. For a threat it is the Priority metadata value,
   * for an aggregate node it is the highest risk level of its descendants.
   */
  riskLevel?: AttackTreeRiskLevel;
  /**
   * MITRE ATT&CK techniques associated with the underlying threat.
   */
  mitreTechniques?: MitreAttackTechnique[];
  /**
   * Longer form text shown on hover, for example the full threat statement.
   */
  tooltip?: string;
  metrics?: AttackTreeNodeMetrics;
  children?: AttackTreeNode[];
}

export interface AttackTreeFilter {
  /**
   * Free text matched against threat statement fields and linked mitigation content.
   */
  searchText?: string;
  /**
   * Tags matched against threat tags and the tags of linked mitigations.
   */
  tags?: string[];
  /**
   * Threat numeric ids to restrict the trees to. Empty or undefined means no restriction.
   */
  threatNumbers?: number[];
  /**
   * Mitigation numeric ids to restrict the trees to. Empty or undefined means no restriction.
   */
  mitigationNumbers?: number[];
  /**
   * Whether mitigation leaf nodes are included. Defaults to true.
   */
  includeMitigations?: boolean;
  /**
   * Whether assumption leaf nodes are included. Defaults to true.
   */
  includeAssumptions?: boolean;
  /**
   * The dimension used to derive tree roots. Defaults to impactedAsset.
   */
  rootDimension?: AttackTreeRootDimension;
  /**
   * The tags to root trees at when rootDimension is tag, one tree per tag. A tag
   * may be a nested path such as `exfiltrate-pii/via-api`, in which case the tree
   * is rooted at that sub-goal. Ignored for the other dimensions.
   */
  rootTags?: string[];
  /**
   * When rootDimension is tag, adds an Untagged tree holding the threats that are
   * not related to any tag at all. Ignored for the other dimensions.
   */
  includeUntagged?: boolean;
}

/**
 * A tag, or a prefix of a nested tag, that a tag rooted tree can be rooted at.
 */
export interface AttackTreeTagRootOption {
  /**
   * The tag path as first written in the workspace, for example
   * `exfiltrate-pii/via-api`. Passed back as a rootTags entry.
   */
  value: string;
  /**
   * The first segment of the path, used to group the options.
   */
  group: string;
  /**
   * How many segments the path has. 1 for a top level tag.
   */
  depth: number;
  /**
   * The number of threats, mitigations and assumptions carrying this tag or a
   * tag nested beneath it.
   */
  entityCount: number;
}

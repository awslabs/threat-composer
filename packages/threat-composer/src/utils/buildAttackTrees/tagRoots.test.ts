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
import buildAttackTrees, { getAttackTreeTagRootOptions, parseTagPath, UNTAGGED_ROOT_LABEL } from '.';
import {
  Assumption,
  AssumptionLink,
  AttackTreeNode,
  Mitigation,
  MitigationLink,
  TemplateThreatStatement,
} from '../../customTypes';

const threat = (id: string, numericId: number, extra: Partial<TemplateThreatStatement> = {}): TemplateThreatStatement => ({
  id,
  numericId,
  threatAction: `action ${id}`,
  threatImpact: 'data disclosure',
  statement: `statement ${id}`,
  ...extra,
});

const tByThreatTag = threat('t-threat-tag', 1, { tags: ['exfiltrate-pii'] });
const tByMitigationTag = threat('t-mitigation-tag', 2);
const tByAssumptionTag = threat('t-assumption-tag', 3);
const tByMitigationAssumptionTag = threat('t-mitigation-assumption-tag', 4);
const tNested = threat('t-nested', 5, { tags: ['Exfiltrate-PII / via-api'] });
const tUntagged = threat('t-untagged', 6);
const tOtherTag = threat('t-other', 7, { tags: ['denial'] });

const mTagged: Mitigation = { id: 'm-tagged', numericId: 1, content: 'Encrypt PII', tags: ['exfiltrate-pii'] };
const mUntagged: Mitigation = { id: 'm-untagged', numericId: 2, content: 'Log access' };

const aOnThreat: Assumption = { id: 'a-threat', numericId: 1, content: 'Users are authenticated', tags: ['exfiltrate-pii'] };
const aOnMitigation: Assumption = { id: 'a-mitigation', numericId: 2, content: 'Keys are rotated', tags: ['exfiltrate-pii'] };

const mitigationLinks: MitigationLink[] = [
  { mitigationId: 'm-tagged', linkedId: 't-mitigation-tag' },
  { mitigationId: 'm-untagged', linkedId: 't-mitigation-assumption-tag' },
];

const assumptionLinks: AssumptionLink[] = [
  { assumptionId: 'a-threat', linkedId: 't-assumption-tag', type: 'Threat' },
  { assumptionId: 'a-mitigation', linkedId: 'm-untagged', type: 'Mitigation' },
];

const baseParams = {
  threats: [tByThreatTag, tByMitigationTag, tByAssumptionTag, tByMitigationAssumptionTag, tNested, tUntagged, tOtherTag],
  mitigations: [mTagged, mUntagged],
  mitigationLinks,
  assumptions: [aOnThreat, aOnMitigation],
  assumptionLinks,
};

const collect = (node: AttackTreeNode, type: AttackTreeNode['type']): AttackTreeNode[] => [
  ...(node.type === type ? [node] : []),
  ...(node.children || []).flatMap((c) => collect(c, type)),
];

const threatIds = (node: AttackTreeNode) => collect(node, 'threat').map((n) => n.entityId);

describe('parseTagPath', () => {
  test('splits on the separator, trims segments and folds case into the key', () => {
    expect(parseTagPath(' Exfiltrate  PII / via API/ ')).toEqual({
      key: 'exfiltrate pii/via api',
      segments: ['Exfiltrate PII', 'via API'],
    });
  });

  test('returns undefined for a tag made only of separators and whitespace', () => {
    expect(parseTagPath(' / / ')).toBeUndefined();
  });
});

describe('getAttackTreeTagRootOptions', () => {
  test('lists every tag and nested prefix across threats, mitigations and assumptions', () => {
    const options = getAttackTreeTagRootOptions({
      threats: baseParams.threats,
      mitigations: baseParams.mitigations,
      assumptions: baseParams.assumptions,
    });

    expect(options).toEqual([
      { value: 'denial', group: 'denial', depth: 1, entityCount: 1 },
      // t-threat-tag, t-nested (via its nested tag), m-tagged, a-threat, a-mitigation
      { value: 'exfiltrate-pii', group: 'exfiltrate-pii', depth: 1, entityCount: 5 },
      { value: 'exfiltrate-pii/via-api', group: 'exfiltrate-pii', depth: 2, entityCount: 1 },
    ]);
  });
});

describe('buildAttackTrees tag dimension', () => {
  test('relates threats to a tag through their own tags, mitigations and assumptions', () => {
    const [tree] = buildAttackTrees({
      ...baseParams,
      filter: { rootDimension: 'tag', rootTags: ['exfiltrate-pii'] },
    });

    expect(tree.label).toBe('Tag: exfiltrate-pii');
    expect(new Set(threatIds(tree))).toEqual(
      new Set(['t-threat-tag', 't-mitigation-tag', 't-assumption-tag', 't-mitigation-assumption-tag', 't-nested']),
    );
    expect(tree.metrics?.threats).toBe(5);
  });

  test('places nested tags under sub-goal nodes, ahead of the impacts at that level', () => {
    const [tree] = buildAttackTrees({
      ...baseParams,
      filter: { rootDimension: 'tag', rootTags: ['exfiltrate-pii'] },
    });

    const [first, ...rest] = tree.children || [];
    expect(first.type).toBe('goal');
    expect(first.label).toBe('via-api');
    expect(threatIds(first)).toEqual(['t-nested']);
    expect(rest.every((n) => n.type === 'impact')).toBe(true);
    expect(rest.flatMap(threatIds)).not.toContain('t-nested');
  });

  test('places a threat carrying both a tag and its nested tag only under the deepest one', () => {
    const both = threat('t-both', 9, { tags: ['exfiltrate-pii', 'exfiltrate-pii/via-api'] });

    const [tree] = buildAttackTrees({
      threats: [both],
      filter: { rootDimension: 'tag', rootTags: ['exfiltrate-pii'] },
    });

    expect(collect(tree, 'goal').map((n) => n.label)).toEqual(['via-api']);
    expect(threatIds(tree)).toEqual(['t-both']);
  });

  test('roots a tree at a nested tag when the nested path is selected', () => {
    const [tree] = buildAttackTrees({
      ...baseParams,
      filter: { rootDimension: 'tag', rootTags: ['exfiltrate-pii/via-api'] },
    });

    expect(tree.label).toBe('Tag: exfiltrate-pii/via-api');
    expect(collect(tree, 'goal')).toEqual([]);
    expect(threatIds(tree)).toEqual(['t-nested']);
  });

  test('adds an Untagged tree with only the threats related to no tag at all', () => {
    const trees = buildAttackTrees({
      ...baseParams,
      filter: { rootDimension: 'tag', rootTags: [], includeUntagged: true },
    });

    expect(trees.map((t) => t.label)).toEqual([UNTAGGED_ROOT_LABEL]);
    expect(threatIds(trees[0])).toEqual(['t-untagged']);
  });

  test('builds no trees when no root tag is selected and Untagged is off', () => {
    expect(buildAttackTrees({ ...baseParams, filter: { rootDimension: 'tag' } })).toEqual([]);
  });

  test('drops a selected tag that no surviving threat is related to', () => {
    const trees = buildAttackTrees({
      ...baseParams,
      filter: { rootDimension: 'tag', rootTags: ['denial', 'exfiltrate-pii'], threatNumbers: [7] },
    });

    expect(trees.map((t) => t.label)).toEqual(['Tag: denial']);
  });

  test('merges selected tags that differ only in case and spacing', () => {
    const trees = buildAttackTrees({
      ...baseParams,
      filter: { rootDimension: 'tag', rootTags: ['exfiltrate-pii', ' EXFILTRATE-PII '] },
    });

    expect(trees).toHaveLength(1);
  });
});

describe('buildAttackTrees assumptions', () => {
  test('renders assumptions beneath the threat or mitigation they are linked to', () => {
    const [tree] = buildAttackTrees({
      ...baseParams,
      filter: { rootDimension: 'tag', rootTags: ['exfiltrate-pii'] },
    });

    const assumptionParents = collect(tree, 'threat')
      .flatMap((t) => [t, ...(t.children || [])])
      .filter((n) => n.children?.some((c) => c.type === 'assumption'))
      .map((n) => n.entityId);

    expect(new Set(assumptionParents)).toEqual(new Set(['t-assumption-tag', 'm-untagged']));
    expect(collect(tree, 'assumption').map((n) => n.displayId).sort()).toEqual(['A-0001', 'A-0002']);
  });

  test('omits assumption nodes when includeAssumptions is false', () => {
    const [tree] = buildAttackTrees({
      ...baseParams,
      filter: { rootDimension: 'tag', rootTags: ['exfiltrate-pii'], includeAssumptions: false },
    });

    expect(collect(tree, 'assumption')).toEqual([]);
  });

  test('keeps a threat for a tag filter when only a linked assumption carries the tag', () => {
    const trees = buildAttackTrees({
      ...baseParams,
      filter: { tags: ['exfiltrate-pii'], threatNumbers: [3] },
    });

    expect(trees.flatMap(threatIds)).toEqual(['t-assumption-tag']);
  });
});

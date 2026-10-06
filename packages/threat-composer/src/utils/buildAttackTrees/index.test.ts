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
import buildAttackTrees, {
  getHighestRiskLevel,
  getRiskLevel,
  normalizeGroupKey,
  sortAttackTreesByRiskLevel,
} from '.';
import {
  Mitigation,
  MitigationLink,
  TemplateThreatStatement,
} from '../../customTypes';

const threat1: TemplateThreatStatement = {
  id: 'threat-1',
  numericId: 1,
  threatSource: 'internal actor',
  prerequisites: 'with access to the admin console',
  threatAction: 'read customer records',
  threatImpact: 'unauthorized disclosure of customer data',
  impactedGoal: ['confidentiality'],
  impactedAssets: ['customer database'],
  statement:
    'An internal actor with access to the admin console can read customer records',
  tags: ['insider'],
  metadata: [
    { key: 'STRIDE', value: ['I'] },
    { key: 'Priority', value: 'High' },
  ],
};

const threat2: TemplateThreatStatement = {
  id: 'threat-2',
  numericId: 2,
  threatSource: 'internet based actor',
  threatAction: 'exhaust the request quota',
  threatImpact: 'the API being unable to serve other users',
  impactedGoal: ['availability'],
  impactedAssets: ['public API'],
  statement: 'An internet based actor can exhaust the request quota',
  tags: ['ddos'],
};

const threat3WithoutAsset: TemplateThreatStatement = {
  id: 'threat-3',
  numericId: 3,
  threatAction: 'tamper with audit logs',
  statement: 'An actor can tamper with audit logs',
};

const mitigation1: Mitigation = {
  id: 'mitigation-1',
  numericId: 1,
  content: 'Enforce least privilege IAM policies',
  tags: ['iam'],
};

const mitigation2: Mitigation = {
  id: 'mitigation-2',
  numericId: 2,
  content: 'Apply request throttling',
};

const mitigationLinks: MitigationLink[] = [
  { mitigationId: 'mitigation-1', linkedId: 'threat-1' },
  { mitigationId: 'mitigation-2', linkedId: 'threat-2' },
];

const baseParams = {
  threats: [threat1, threat2, threat3WithoutAsset],
  mitigations: [mitigation1, mitigation2],
  mitigationLinks,
};

describe('buildAttackTrees', () => {
  test('builds one tree per impacted asset by default', () => {
    const trees = buildAttackTrees(baseParams);

    expect(trees.map((t) => t.label)).toEqual([
      'Compromise: customer database',
      'Compromise: public API',
      'Compromise: Unspecified asset',
    ]);
  });

  test('nests impact, threat, prerequisite and mitigation nodes', () => {
    const [tree] = buildAttackTrees({
      ...baseParams,
      filter: { threatNumbers: [1] },
    });

    expect(tree.type).toBe('root');
    expect(tree.operator).toBe('OR');
    expect(tree.metrics).toEqual({ threats: 1, mitigations: 1 });

    const impact = tree.children?.[0];
    expect(impact?.type).toBe('impact');
    expect(impact?.label).toBe('unauthorized disclosure of customer data');

    const threatNode = impact?.children?.[0];
    expect(threatNode?.type).toBe('threat');
    expect(threatNode?.displayId).toBe('T-0001');
    expect(threatNode?.operator).toBe('AND');
    expect(threatNode?.priority).toBe('High');
    expect(threatNode?.stride).toEqual(['I']);

    expect(threatNode?.children?.map((c) => [c.type, c.displayId])).toEqual([
      ['prerequisite', undefined],
      ['mitigation', 'M-0001'],
    ]);
  });

  test('marks a threat without a prerequisite as an OR node', () => {
    const trees = buildAttackTrees({
      ...baseParams,
      filter: { threatNumbers: [2] },
    });
    const threatNode = trees[0].children?.[0].children?.[0];

    expect(threatNode?.operator).toBe('OR');
    expect(threatNode?.children?.map((c) => c.type)).toEqual(['mitigation']);
  });

  test('groups by security objective when requested', () => {
    const trees = buildAttackTrees({
      ...baseParams,
      filter: { rootDimension: 'impactedGoal' },
    });

    // Ordered by risk, so the High risk confidentiality tree comes before the two
    // trees with no risk set, which stay in alphabetical order.
    expect(trees.map((t) => t.label)).toEqual([
      'Reduce: confidentiality',
      'Reduce: availability',
      'Reduce: Unspecified security objective',
    ]);
  });

  test('resolves STRIDE roots to their labels', () => {
    const trees = buildAttackTrees({
      ...baseParams,
      filter: { rootDimension: 'stride' },
    });

    expect(trees.map((t) => t.label)).toEqual([
      'Attack category: Information Disclosure',
      'Attack category: No STRIDE category',
    ]);
  });

  test('filters by threat number', () => {
    const trees = buildAttackTrees({
      ...baseParams,
      filter: { threatNumbers: [3] },
    });

    expect(trees).toHaveLength(1);
    expect(trees[0].label).toBe('Compromise: Unspecified asset');
    expect(trees[0].metrics?.threats).toBe(1);
  });

  test('filters by mitigation number and drops threats without a match', () => {
    const trees = buildAttackTrees({
      ...baseParams,
      filter: { mitigationNumbers: [2] },
    });

    expect(trees.map((t) => t.label)).toEqual(['Compromise: public API']);
    expect(trees[0].metrics).toEqual({ threats: 1, mitigations: 1 });
  });

  test('keeps a threat when either the threat or a linked mitigation carries a selected tag', () => {
    const byThreatTag = buildAttackTrees({
      ...baseParams,
      filter: { tags: ['ddos'] },
    });
    expect(byThreatTag.map((t) => t.label)).toEqual(['Compromise: public API']);

    const byMitigationTag = buildAttackTrees({
      ...baseParams,
      filter: { tags: ['iam'] },
    });
    expect(byMitigationTag.map((t) => t.label)).toEqual([
      'Compromise: customer database',
    ]);
  });

  test('matches search text against threats and linked mitigations', () => {
    const byThreat = buildAttackTrees({
      ...baseParams,
      filter: { searchText: 'audit logs' },
    });
    expect(byThreat.map((t) => t.metrics?.threats)).toEqual([1]);

    const byMitigation = buildAttackTrees({
      ...baseParams,
      filter: { searchText: 'throttling' },
    });
    expect(byMitigation.map((t) => t.label)).toEqual([
      'Compromise: public API',
    ]);

    expect(
      buildAttackTrees({
        ...baseParams,
        filter: { searchText: 'no such text' },
      }),
    ).toEqual([]);
  });

  test('omits mitigation nodes when includeMitigations is false', () => {
    const trees = buildAttackTrees({
      ...baseParams,
      filter: { includeMitigations: false, threatNumbers: [2] },
    });
    const threatNode = trees[0].children?.[0].children?.[0];

    expect(threatNode?.children).toBeUndefined();
    expect(trees[0].metrics).toEqual({ threats: 1, mitigations: 0 });
  });

  test('places a threat under every asset it impacts', () => {
    const multiAsset: TemplateThreatStatement = {
      ...threat1,
      impactedAssets: ['customer database', 'audit trail'],
    };

    const trees = buildAttackTrees({ threats: [multiAsset] });

    expect(trees.map((t) => t.label)).toEqual([
      'Compromise: audit trail',
      'Compromise: customer database',
    ]);
  });

  test('ignores mitigation links that point at unknown mitigations', () => {
    const trees = buildAttackTrees({
      threats: [threat1],
      mitigations: [],
      mitigationLinks: [{ mitigationId: 'missing', linkedId: 'threat-1' }],
    });

    expect(trees[0].metrics).toEqual({ threats: 1, mitigations: 0 });
  });

  test('returns an empty list when there are no threats', () => {
    expect(buildAttackTrees({ threats: [] })).toEqual([]);
  });
});

describe('buildAttackTrees de-duplication', () => {
  test('merges roots that differ only by case, whitespace or trailing punctuation', () => {
    const trees = buildAttackTrees({
      threats: [
        {
          id: 'a',
          numericId: 1,
          impactedAssets: ['Customer Database'],
          threatAction: 'one',
        },
        {
          id: 'b',
          numericId: 2,
          impactedAssets: ['customer  database'],
          threatAction: 'two',
        },
        {
          id: 'c',
          numericId: 3,
          impactedAssets: ['customer database.'],
          threatAction: 'three',
        },
      ],
    });

    expect(trees).toHaveLength(1);
    expect(trees[0].label).toBe('Compromise: Customer Database');
    expect(trees[0].metrics?.threats).toBe(3);
  });

  test('merges impact nodes that differ only by case or whitespace', () => {
    const trees = buildAttackTrees({
      threats: [
        {
          id: 'a',
          numericId: 1,
          impactedAssets: ['api'],
          threatImpact: 'Data Loss',
          threatAction: 'one',
        },
        {
          id: 'b',
          numericId: 2,
          impactedAssets: ['api'],
          threatImpact: 'data   loss',
          threatAction: 'two',
        },
      ],
    });

    expect(trees[0].children).toHaveLength(1);
    expect(trees[0].children?.[0].label).toBe('Data Loss');
    expect(trees[0].children?.[0].children).toHaveLength(2);
  });

  test('lists a threat once when it names the same asset twice in different casing', () => {
    const trees = buildAttackTrees({
      threats: [
        {
          id: 'a',
          numericId: 1,
          impactedAssets: ['Customer DB', 'customer db'],
          threatAction: 'one',
        },
      ],
    });

    expect(trees).toHaveLength(1);
    expect(trees[0].metrics?.threats).toBe(1);
    expect(trees[0].children?.[0].children).toHaveLength(1);
  });

  test('ignores duplicate mitigation links to the same mitigation', () => {
    const trees = buildAttackTrees({
      threats: [threat1],
      mitigations: [mitigation1],
      mitigationLinks: [
        { mitigationId: 'mitigation-1', linkedId: 'threat-1' },
        { mitigationId: 'mitigation-1', linkedId: 'threat-1' },
      ],
    });

    expect(trees[0].metrics?.mitigations).toBe(1);
  });
});

describe('buildAttackTrees risk levels', () => {
  test('maps threat Priority onto a risk level', () => {
    const trees = buildAttackTrees({
      ...baseParams,
      filter: { threatNumbers: [1] },
    });
    const threatNode = trees[0].children?.[0].children?.[0];

    expect(threatNode?.riskLevel).toBe('High');
  });

  test('defaults to Not set when a threat has no Priority', () => {
    const trees = buildAttackTrees({
      ...baseParams,
      filter: { threatNumbers: [2] },
    });

    expect(trees[0].children?.[0].children?.[0].riskLevel).toBe('Not set');
    expect(trees[0].riskLevel).toBe('Not set');
  });

  test('rolls the highest descendant risk up to the impact and root nodes', () => {
    const trees = buildAttackTrees({
      threats: [
        {
          id: 'a',
          numericId: 1,
          impactedAssets: ['api'],
          threatImpact: 'outage',
          threatAction: 'one',
          metadata: [{ key: 'Priority', value: 'Low' }],
        },
        {
          id: 'b',
          numericId: 2,
          impactedAssets: ['api'],
          threatImpact: 'outage',
          threatAction: 'two',
          metadata: [{ key: 'Priority', value: 'Medium' }],
        },
        {
          id: 'c',
          numericId: 3,
          impactedAssets: ['api'],
          threatImpact: 'data loss',
          threatAction: 'three',
          metadata: [{ key: 'Priority', value: 'High' }],
        },
      ],
    });

    const impacts = trees[0].children || [];
    const dataLoss = impacts.find((i) => i.label === 'data loss');
    const outage = impacts.find((i) => i.label === 'outage');

    expect(dataLoss?.riskLevel).toBe('High');
    expect(outage?.riskLevel).toBe('Medium');
    expect(trees[0].riskLevel).toBe('High');
  });
});

describe('getRiskLevel', () => {
  test('maps the priority values', () => {
    expect(getRiskLevel('High')).toBe('High');
    expect(getRiskLevel('Medium')).toBe('Medium');
    expect(getRiskLevel('Low')).toBe('Low');
    expect(getRiskLevel(undefined)).toBe('Not set');
    expect(getRiskLevel('something else')).toBe('Not set');
  });
});

describe('getHighestRiskLevel', () => {
  test('returns the most severe level present', () => {
    expect(getHighestRiskLevel(['Low', 'High', 'Medium'])).toBe('High');
    expect(getHighestRiskLevel(['Low', 'Medium'])).toBe('Medium');
    expect(getHighestRiskLevel(['Not set', 'Low'])).toBe('Low');
    expect(getHighestRiskLevel([])).toBe('Not set');
  });
});

describe('normalizeGroupKey', () => {
  test('folds case, collapses whitespace and drops trailing punctuation', () => {
    expect(normalizeGroupKey('  Customer   Database. ')).toBe(
      'customer database',
    );
    expect(normalizeGroupKey('API')).toBe('api');
  });
});

describe('buildAttackTrees MITRE ATT&CK techniques', () => {
  test('attaches explicitly tagged techniques to the threat node', () => {
    const trees = buildAttackTrees({
      threats: [
        {
          id: 'a',
          numericId: 1,
          impactedAssets: ['api'],
          threatAction: 'one',
          tags: ['T1078'],
        },
      ],
    });

    expect(trees[0].children?.[0].children?.[0].mitreTechniques).toEqual([
      {
        id: 'T1078',
        name: 'Valid Accounts',
        url: 'https://attack.mitre.org/techniques/T1078/',
        source: 'explicit',
      },
    ]);
  });

  test('leaves the technique list empty when nothing matches', () => {
    const trees = buildAttackTrees({
      threats: [
        {
          id: 'a',
          numericId: 1,
          impactedAssets: ['api'],
          threatAction: 'do something unremarkable',
        },
      ],
    });

    expect(trees[0].children?.[0].children?.[0].mitreTechniques).toEqual([]);
  });
});

describe('buildAttackTrees STRIDE ordering', () => {
  test('orders the STRIDE values of a threat canonically', () => {
    const trees = buildAttackTrees({
      threats: [
        {
          id: 'a',
          numericId: 1,
          impactedAssets: ['api'],
          threatAction: 'one',
          metadata: [{ key: 'STRIDE', value: ['E', 'I', 'S', 'D', 'R', 'T'] }],
        },
      ],
    });

    expect(trees[0].children?.[0].children?.[0].stride).toEqual([
      'S',
      'T',
      'R',
      'I',
      'D',
      'E',
    ]);
  });

  test('de-duplicates repeated STRIDE values', () => {
    const trees = buildAttackTrees({
      threats: [
        {
          id: 'a',
          numericId: 1,
          impactedAssets: ['api'],
          threatAction: 'one',
          metadata: [{ key: 'STRIDE', value: ['I', 'S', 'I'] }],
        },
      ],
    });

    expect(trees[0].children?.[0].children?.[0].stride).toEqual(['S', 'I']);
  });
});

describe('buildAttackTrees ordering', () => {
  const threatWithPriority = (
    id: string,
    numericId: number,
    asset: string,
    priority?: string,
  ) => ({
    id,
    numericId,
    impactedAssets: [asset],
    threatAction: `action ${numericId}`,
    ...(priority ? { metadata: [{ key: 'Priority', value: priority }] } : {}),
  });

  test('lists the trees most severe first', () => {
    const trees = buildAttackTrees({
      threats: [
        threatWithPriority('a', 1, 'alpha'),
        threatWithPriority('b', 2, 'bravo', 'Low'),
        threatWithPriority('c', 3, 'charlie', 'High'),
        threatWithPriority('d', 4, 'delta', 'Medium'),
      ],
    });

    expect(trees.map((t) => [t.label, t.riskLevel])).toEqual([
      ['Compromise: charlie', 'High'],
      ['Compromise: delta', 'Medium'],
      ['Compromise: bravo', 'Low'],
      ['Compromise: alpha', 'Not set'],
    ]);
  });

  test('keeps trees of equal risk in alphabetical order', () => {
    const trees = buildAttackTrees({
      threats: [
        threatWithPriority('a', 1, 'zulu', 'High'),
        threatWithPriority('b', 2, 'alpha', 'High'),
        threatWithPriority('c', 3, 'mike', 'High'),
      ],
    });

    expect(trees.map((t) => t.label)).toEqual([
      'Compromise: alpha',
      'Compromise: mike',
      'Compromise: zulu',
    ]);
  });

});

describe('sortAttackTreesByRiskLevel', () => {
  test('sorts High, Medium, Low, then Not set', () => {
    const trees = sortAttackTreesByRiskLevel([
      { id: '1', label: 'low', type: 'root', riskLevel: 'Low' },
      { id: '2', label: 'unset', type: 'root' },
      { id: '3', label: 'high', type: 'root', riskLevel: 'High' },
      { id: '4', label: 'notset', type: 'root', riskLevel: 'Not set' },
      { id: '5', label: 'medium', type: 'root', riskLevel: 'Medium' },
    ]);

    expect(trees.map((t) => t.label)).toEqual([
      'high',
      'medium',
      'low',
      'unset',
      'notset',
    ]);
  });

  test('leaves an empty list alone', () => {
    expect(sortAttackTreesByRiskLevel([])).toEqual([]);
  });
});

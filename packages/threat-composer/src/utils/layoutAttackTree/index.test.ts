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
import layoutAttackTree, { DEFAULT_ATTACK_TREE_LAYOUT_OPTIONS, wrapLabel } from '.';
import { AttackTreeNode } from '../../customTypes';

const tree: AttackTreeNode = {
  id: 'root',
  label: 'Compromise: customer database',
  type: 'root',
  operator: 'OR',
  children: [
    {
      id: 'impact-1',
      label: 'unauthorized disclosure',
      type: 'impact',
      operator: 'OR',
      children: [
        { id: 'threat-1', label: 'read customer records', type: 'threat' },
        { id: 'threat-2', label: 'export a database snapshot', type: 'threat' },
      ],
    },
  ],
};

describe('wrapLabel', () => {
  test('returns a single line when the label fits', () => {
    expect(wrapLabel('short label', 20, 3)).toEqual(['short label']);
  });

  test('wraps on word boundaries', () => {
    expect(wrapLabel('one two three four', 9, 5)).toEqual(['one two', 'three', 'four']);
  });

  test('hard splits words longer than the line length', () => {
    expect(wrapLabel('abcdefghij', 4, 5)).toEqual(['abcd', 'efgh', 'ij']);
  });

  test('truncates with an ellipsis beyond maxLines', () => {
    const lines = wrapLabel('one two three four five six seven', 9, 2);

    expect(lines).toHaveLength(2);
    expect(lines[1].endsWith('…')).toBe(true);
  });

  test('collapses whitespace and handles an empty label', () => {
    expect(wrapLabel('  a   b  ', 20, 2)).toEqual(['a b']);
    expect(wrapLabel('', 20, 2)).toEqual(['']);
  });
});

describe('layoutAttackTree', () => {
  test('positions nodes by depth on the horizontal axis', () => {
    const { nodes } = layoutAttackTree(tree);
    const { nodeWidth, horizontalGap } = DEFAULT_ATTACK_TREE_LAYOUT_OPTIONS;

    const byId = Object.fromEntries(nodes.map((n) => [n.node.id, n]));

    expect(byId.root.x).toBe(0);
    expect(byId['impact-1'].x).toBe(nodeWidth + horizontalGap);
    expect(byId['threat-1'].x).toBe(2 * (nodeWidth + horizontalGap));
    expect(byId['threat-2'].x).toBe(2 * (nodeWidth + horizontalGap));
  });

  test('stacks leaves without overlapping', () => {
    const { nodes } = layoutAttackTree(tree);
    const byId = Object.fromEntries(nodes.map((n) => [n.node.id, n]));

    const first = byId['threat-1'];
    const second = byId['threat-2'];

    expect(second.y).toBeGreaterThanOrEqual(first.y + first.height);
  });

  test('centres a parent on the span of its children', () => {
    const { nodes } = layoutAttackTree(tree);
    const byId = Object.fromEntries(nodes.map((n) => [n.node.id, n]));

    const parent = byId['impact-1'];
    const first = byId['threat-1'];
    const last = byId['threat-2'];

    const parentCentre = parent.y + parent.height / 2;
    const childrenCentre = (first.y + last.y + last.height) / 2;

    expect(parentCentre).toBeCloseTo(childrenCentre);
  });

  test('emits one edge per parent child relationship', () => {
    const { edges } = layoutAttackTree(tree);

    expect(edges.map((e) => e.id)).toEqual(['root->impact-1', 'impact-1->threat-1', 'impact-1->threat-2']);
    edges.forEach((edge) => expect(edge.path.startsWith('M ')).toBe(true));
  });

  test('reports a canvas large enough to contain every node', () => {
    const { nodes, width, height } = layoutAttackTree(tree);

    nodes.forEach((n) => {
      expect(n.x + n.width).toBeLessThanOrEqual(width);
      expect(n.y + n.height).toBeLessThanOrEqual(height);
      expect(n.y).toBeGreaterThanOrEqual(0);
    });
  });

  test.each(['AND', 'OR', undefined] as const)('marks only mitigation links as defensive under %p', (operator) => {
    const { edges } = layoutAttackTree({
      id: 'threat',
      label: 'Read records',
      type: 'threat',
      operator,
      children: [
        { id: 'prerequisite', label: 'Console access', type: 'prerequisite' },
        { id: 'mitigation', label: 'Least privilege', type: 'mitigation' },
        { id: 'step', label: 'Export records', type: 'threat' },
      ],
    });

    expect(edges.map(({ fromId, toId, isDefensive }) => ({ fromId, toId, isDefensive }))).toEqual([
      { fromId: 'threat', toId: 'prerequisite', isDefensive: false },
      { fromId: 'threat', toId: 'mitigation', isDefensive: true },
      { fromId: 'threat', toId: 'step', isDefensive: false },
    ]);
  });

  test('keeps all nodes on canvas when a parent is taller than its children span', () => {
    const tall: AttackTreeNode = {
      id: 'root',
      label: Array.from({ length: 40 }, (_, i) => `word${i}`).join(' '),
      type: 'root',
      children: [{ id: 'leaf', label: 'x', type: 'threat' }],
    };

    const { nodes } = layoutAttackTree(tall, { maxLines: 12 });

    nodes.forEach((n) => expect(n.y).toBeGreaterThanOrEqual(0));
  });

  test('lays out a single node tree', () => {
    const { nodes, edges, width } = layoutAttackTree({ id: 'only', label: 'only', type: 'root' });

    expect(nodes).toHaveLength(1);
    expect(edges).toHaveLength(0);
    expect(width).toBe(DEFAULT_ATTACK_TREE_LAYOUT_OPTIONS.nodeWidth);
  });

  test('reserves footer space for nodes carrying STRIDE or ATT&CK badges', () => {
    const plain = layoutAttackTree({ id: 'n', label: 'same label', type: 'threat' }).nodes[0];
    const withStride = layoutAttackTree({ id: 'n', label: 'same label', type: 'threat', stride: ['I'] }).nodes[0];
    const withTechniques = layoutAttackTree({
      id: 'n',
      label: 'same label',
      type: 'threat',
      mitreTechniques: [{ id: 'T1078', url: 'https://attack.mitre.org/techniques/T1078/', source: 'explicit' }],
    }).nodes[0];

    expect(plain.hasFooter).toBe(false);
    expect(withStride.hasFooter).toBe(true);
    expect(withTechniques.hasFooter).toBe(true);
    expect(withStride.height).toBe(plain.height + DEFAULT_ATTACK_TREE_LAYOUT_OPTIONS.footerHeight);
    expect(withTechniques.height).toBe(plain.height + DEFAULT_ATTACK_TREE_LAYOUT_OPTIONS.footerHeight);
  });

  test('does not reserve footer space for empty badge lists', () => {
    const node = layoutAttackTree({
      id: 'n',
      label: 'x',
      type: 'threat',
      stride: [],
      mitreTechniques: [],
    }).nodes[0];

    expect(node.hasFooter).toBe(false);
  });
});

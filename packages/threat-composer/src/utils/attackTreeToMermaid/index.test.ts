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
import { parse } from 'yaml';
import attackTreeToMermaid, { attackTreesToMermaidMarkdown, escapeMermaidLabel } from '.';
import { AttackTreeNode } from '../../customTypes';

const tree: AttackTreeNode = {
  id: 'root-0',
  label: 'Compromise: customer database',
  type: 'root',
  operator: 'OR',
  riskLevel: 'High',
  metrics: { threats: 1, mitigations: 1 },
  children: [
    {
      id: 'root-0-impact-0',
      label: 'unauthorized disclosure of customer data',
      type: 'impact',
      operator: 'OR',
      riskLevel: 'High',
      metrics: { threats: 1, mitigations: 1 },
      children: [
        {
          id: 'threat-threat-1',
          label: 'read customer records',
          type: 'threat',
          operator: 'AND',
          displayId: 'T-0001',
          riskLevel: 'High',
          stride: ['S', 'I'],
          mitreTechniques: [{ id: 'T1078', url: 'https://attack.mitre.org/techniques/T1078', source: 'explicit' }],
          children: [
            {
              id: 'threat-threat-1-prerequisite',
              label: 'with access to the admin console',
              type: 'prerequisite',
            },
            {
              id: 'threat-threat-1-mitigation-1',
              label: 'Enforce least privilege IAM policies',
              type: 'mitigation',
              displayId: 'M-0001',
            },
          ],
        },
      ],
    },
  ],
};

describe('attackTreeToMermaid', () => {
  test('renders a left to right flowchart with a quoted title', () => {
    const mermaid = attackTreeToMermaid(tree);

    // The title must be quoted because the label contains a colon, which YAML
    // frontmatter would otherwise reject.
    expect(mermaid).toContain('title: "Compromise: customer database"');
    expect(mermaid).toContain('flowchart LR');
  });

  test.each([
    'C:\\secrets',
    'C:\\temp\\new\\',
    'Compromise "the [primary] {store}" #1',
    'First line\n---\nconfig: {securityLevel: loose}\nLast line\t',
  ])('encodes the title as a YAML string: %p', (label) => {
    const mermaid = attackTreeToMermaid({ ...tree, label });
    const frontmatter = mermaid.split('\n---\n')[0].slice(4);
    expect(parse(frontmatter)).toEqual({ title: label });
    expect(mermaid.match(/^---$/gm)).toHaveLength(2);
  });

  test('renders every node exactly once with a simple identifier', () => {
    const mermaid = attackTreeToMermaid(tree);

    expect(mermaid.match(/^ {2}n\d+[[({]/gm)).toHaveLength(5);
    expect(mermaid).not.toContain('threat-threat-1');
  });

  test('renders an edge per parent child pair and annotates only attack edges with AND', () => {
    const mermaid = attackTreeToMermaid(tree);

    expect(mermaid).toContain('  n0 --> n1');
    expect(mermaid).toContain('  n1 --> n2');
    expect(mermaid).toContain('  n2 -->|AND| n3');
    expect(mermaid).toContain('  n2 -. mitigated by .-> n4');
    expect(mermaid).not.toContain('  n2 -->|AND| n4');
  });

  test.each(['AND', 'OR', undefined] as const)('keeps mitigation links defensive under %p', (operator) => {
    const mermaid = attackTreeToMermaid({
      id: 'threat',
      label: 'Read records',
      type: 'threat',
      operator,
      children: [
        { id: 'prerequisite', label: 'Console access', type: 'prerequisite' },
        { id: 'mitigation', label: 'Least privilege', type: 'mitigation' },
      ],
    });

    expect(mermaid.split('\n').filter((line) => /(?:-->|\.->)/.test(line))).toEqual([
      operator === 'AND' ? '  n0 -->|AND| n1' : '  n0 --> n1',
      '  n0 -. mitigated by .-> n2',
    ]);
  });

  test('includes the entity id, risk, STRIDE and technique ids in the label', () => {
    const mermaid = attackTreeToMermaid(tree);

    expect(mermaid).toContain('T-0001 · AND · Risk High · STRIDE SI · T1078 — read customer records');
  });

  test('emits no HTML tags in node labels, regardless of HTML label support', () => {
    const mermaid = attackTreeToMermaid({
      id: 'root-0',
      label: 'Compromise <script>alert(1)</script> the store',
      type: 'root',
      children: [{ id: 'c', label: 'a <b>bold</b> claim', type: 'threat' }],
    });

    const diagram = mermaid.split('flowchart LR\n')[1];
    const labelLines = diagram.split('\n').filter((line) => line.includes('"'));

    expect(labelLines).not.toHaveLength(0);
    labelLines.forEach((line) => {
      expect(line).not.toContain('<');
      expect(line).not.toContain('>');
    });
    expect(diagram).not.toMatch(/<[a-zA-Z/][^>]*>/);
    expect(mermaid).not.toContain('&quot;');
    expect(mermaid).not.toContain('&num;');
  });

  test('shapes and classes each node by its type', () => {
    const mermaid = attackTreeToMermaid(tree);

    expect(mermaid).toContain('n0(["');
    expect(mermaid).toContain('n1{{"');
    expect(mermaid).toContain('n2["');
    expect(mermaid).toContain('classDef threat');
    expect(mermaid).toContain('class n2 threat');
  });

  test('escapes characters that would break mermaid syntax', () => {
    const mermaid = attackTreeToMermaid({
      id: 'root-0',
      label: 'Compromise "the [primary] {store}" #1',
      type: 'root',
    });

    const nodeLine = mermaid.split('\n').find((line) => line.startsWith('  n0')) || '';

    // Mermaid entity codes rather than HTML entities, so nothing depends on HTML
    // labels being enabled.
    expect(nodeLine).toContain('#quot;');
    expect(nodeLine).toContain('#35;1');
    expect(nodeLine).not.toContain('[primary]');
    expect(nodeLine).not.toContain('{store}');
  });

  test('drops backticks so text cannot be read as a mermaid markdown string', () => {
    const mermaid = attackTreeToMermaid({ id: 'root-0', label: 'Run `rm -rf /` remotely', type: 'root' });

    expect(mermaid.split('flowchart LR\n')[1]).not.toContain('`');
  });
});

describe('escapeMermaidLabel', () => {
  test('collapses whitespace and trims', () => {
    expect(escapeMermaidLabel('  a   b \n c ')).toBe('a b c');
  });

  test('tolerates empty input', () => {
    expect(escapeMermaidLabel('')).toBe('');
  });
});

describe('attackTreesToMermaidMarkdown', () => {
  test('renders one fenced mermaid block per tree', () => {
    const markdown = attackTreesToMermaidMarkdown([tree, { ...tree, id: 'root-1', label: 'Compromise: public API' }]);

    expect(markdown.match(/```mermaid/g)).toHaveLength(2);
    expect(markdown).toContain('# Attack trees');
    expect(markdown).toContain('## Compromise: customer database');
    expect(markdown).toContain('## Compromise: public API');
    expect(markdown).toContain('Threats: 1 · Mitigations: 1 · Risk: High');
  });

  test('accepts a custom title', () => {
    expect(attackTreesToMermaidMarkdown([tree], 'My workspace')).toContain('# My workspace');
  });

  test('handles an empty list', () => {
    expect(attackTreesToMermaidMarkdown([])).toContain('No attack trees to export.');
  });
});

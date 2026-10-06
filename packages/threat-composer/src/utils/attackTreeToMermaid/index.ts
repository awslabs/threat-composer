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
import { AttackTreeNode, AttackTreeNodeType } from '../../customTypes';

/**
 * Mermaid class definitions, one per node type, so that an exported diagram keeps
 * the colour coding of the on screen diagram.
 */
export const MERMAID_CLASS_DEFS: { [key in AttackTreeNodeType]: string } = {
  root: 'fill:#fdecea,stroke:#d13212,stroke-width:2px,color:#16191f',
  impact: 'fill:#fef6e7,stroke:#906806,stroke-width:1px,color:#16191f',
  threat: 'fill:#f0f8ff,stroke:#0972d3,stroke-width:1px,color:#16191f',
  prerequisite: 'fill:#ffffff,stroke:#8c8c94,stroke-width:1px,color:#16191f',
  mitigation: 'fill:#effff1,stroke:#037f0c,stroke-width:1px,color:#16191f',
};

const NODE_TYPE_LABEL: { [key in AttackTreeNodeType]: string } = {
  root: 'Goal',
  impact: 'Impact',
  threat: 'Threat',
  prerequisite: 'Prerequisite',
  mitigation: 'Mitigation',
};

/**
 * Escapes text for use inside a mermaid node label.
 *
 * No HTML is emitted, so the output renders the same whether or not the consuming
 * renderer allows HTML labels:
 * - Quotes and hashes become mermaid entity codes, which is how mermaid itself
 *   escapes the characters it uses to delimit labels.
 * - The characters mermaid treats as shape syntax are dropped, so a threat
 *   statement containing brackets cannot break the diagram.
 * - Angle brackets and backticks are dropped so no text can be read as an HTML
 *   tag or as a mermaid markdown string.
 */
export const escapeMermaidLabel = (text: string) =>
  (text || '')
    .replace(/\s+/g, ' ')
    .trim()
    // Hashes first, otherwise the entity codes introduced below are mangled.
    .replace(/#/g, '#35;')
    .replace(/"/g, '#quot;')
    .replace(/[[\]{}()<>|`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Mermaid node ids must be simple identifiers, so the tree node ids (which
 * contain UUIDs and hyphens) are replaced by a stable index per diagram.
 */
const createIdFactory = () => {
  const ids = new Map<string, string>();

  return (nodeId: string) => {
    const existing = ids.get(nodeId);
    if (existing) {
      return existing;
    }

    const id = `n${ids.size}`;
    ids.set(nodeId, id);
    return id;
  };
};

/**
 * Builds the label of a node: the entity id or node type, the operator, the risk
 * level when set, the STRIDE categories in canonical order, the ATT&CK technique
 * ids, and then the text of the node.
 *
 * The label is a single line of plain text. Mermaid only breaks a label across
 * lines with an HTML tag or a markdown string, and neither renders reliably across
 * every mermaid version and host, so the parts are joined instead.
 */
const getNodeLabel = (node: AttackTreeNode) => {
  const header: string[] = [node.displayId || NODE_TYPE_LABEL[node.type]];

  if (node.operator && node.children?.length) {
    header.push(node.operator);
  }

  if (node.riskLevel && node.riskLevel !== 'Not set') {
    header.push(`Risk ${node.riskLevel}`);
  }

  if (node.stride?.length) {
    header.push(`STRIDE ${node.stride.join('')}`);
  }

  if (node.mitreTechniques?.length) {
    header.push(node.mitreTechniques.map((t) => t.id).join(' '));
  }

  return escapeMermaidLabel(`${header.join(' · ')} — ${node.label}`);
};

/**
 * The shape used per node type. Mermaid shapes carry meaning here: the goal is a
 * stadium, the impact grouping is a hexagon, and leaf detail is a plain
 * rectangle.
 */
const wrapInShape = (id: string, type: AttackTreeNodeType, label: string) => {
  switch (type) {
    case 'root':
      return `${id}(["${label}"])`;
    case 'impact':
      return `${id}{{"${label}"}}`;
    case 'mitigation':
      return `${id}("${label}")`;
    case 'prerequisite':
      return `${id}[/"${label}"/]`;
    case 'threat':
    default:
      return `${id}["${label}"]`;
  }
};

/**
 * Renders a single attack tree as a mermaid flowchart, laid out left to right to
 * match the on screen diagram.
 *
 * Attack edges annotate AND parents. Mitigation children use dotted defensive
 * links instead, since controls are not requirements for an attack.
 */
export const attackTreeToMermaid = (tree: AttackTreeNode): string => {
  const nextId = createIdFactory();
  const nodeLines: string[] = [];
  const edgeLines: string[] = [];
  const classMembers = new Map<AttackTreeNodeType, string[]>();

  const visit = (node: AttackTreeNode) => {
    const id = nextId(node.id);

    nodeLines.push(`  ${wrapInShape(id, node.type, getNodeLabel(node))}`);
    classMembers.set(node.type, [...(classMembers.get(node.type) || []), id]);

    (node.children || []).forEach((child) => {
      const childId = nextId(child.id);
      const operator = node.operator;
      if (child.type === 'mitigation') {
        edgeLines.push(`  ${id} -. mitigated by .-> ${childId}`);
      } else {
        // Only AND is worth annotating, OR is the default reading of a branch.
        edgeLines.push(operator === 'AND' ? `  ${id} -->|AND| ${childId}` : `  ${id} --> ${childId}`);
      }
      visit(child);
    });
  };

  visit(tree);

  const classDefLines = Array.from(classMembers.keys()).map((type) => `  classDef ${type} ${MERMAID_CLASS_DEFS[type]}`);

  const classLines = Array.from(classMembers.entries()).map(([type, ids]) => `  class ${ids.join(',')} ${type}`);

  return [
    '---',
    // JSON string encoding is valid YAML and escapes backslashes, quotes and newlines.
    `title: ${JSON.stringify(tree.label)}`,
    '---',
    'flowchart LR',
    ...nodeLines,
    ...edgeLines,
    ...classDefLines,
    ...classLines,
  ].join('\n');
};

/**
 * Renders every attack tree as a markdown document, one mermaid fenced block per
 * tree, ready to paste into a wiki, a pull request or a design document.
 */
export const attackTreesToMermaidMarkdown = (trees: AttackTreeNode[], title = 'Attack trees'): string => {
  if (trees.length === 0) {
    return `# ${title}\n\nNo attack trees to export.\n`;
  }

  const sections = trees.map((tree) =>
    [
      `## ${tree.label}`,
      '',
      `Threats: ${tree.metrics?.threats ?? 0} · Mitigations: ${tree.metrics?.mitigations ?? 0} · Risk: ${
        tree.riskLevel || 'Not set'
      }`,
      '',
      '```mermaid',
      attackTreeToMermaid(tree),
      '```',
    ].join('\n'),
  );

  return `${[`# ${title}`, ...sections].join('\n\n')}\n`;
};

export default attackTreeToMermaid;

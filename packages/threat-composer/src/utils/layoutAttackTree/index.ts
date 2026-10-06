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
import { AttackTreeNode } from '../../customTypes';

export interface AttackTreeLayoutOptions {
  nodeWidth: number;
  horizontalGap: number;
  verticalGap: number;
  lineHeight: number;
  headerHeight: number;
  /**
   * Extra height reserved at the bottom of a node when it carries badges, such as
   * STRIDE letters or MITRE ATT&CK technique links.
   */
  footerHeight: number;
  paddingY: number;
  charsPerLine: number;
  maxLines: number;
}

export const DEFAULT_ATTACK_TREE_LAYOUT_OPTIONS: AttackTreeLayoutOptions = {
  nodeWidth: 240,
  horizontalGap: 72,
  verticalGap: 14,
  lineHeight: 15,
  headerHeight: 18,
  footerHeight: 20,
  paddingY: 10,
  charsPerLine: 34,
  maxLines: 4,
};

export interface AttackTreeLayoutNode {
  node: AttackTreeNode;
  /**
   * The wrapped label, one entry per rendered line.
   */
  lines: string[];
  /**
   * Whether the node reserves space at the bottom for badges.
   */
  hasFooter: boolean;
  depth: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AttackTreeLayoutEdge {
  id: string;
  fromId: string;
  toId: string;
  isDefensive: boolean;
  /**
   * SVG path data connecting the right edge of the parent to the left edge of the child.
   */
  path: string;
}

export interface AttackTreeLayout {
  nodes: AttackTreeLayoutNode[];
  edges: AttackTreeLayoutEdge[];
  width: number;
  height: number;
}

/**
 * Greedily wraps text to the given line length, truncating with an ellipsis once
 * maxLines is reached. Words longer than the line length are hard split.
 */
export const wrapLabel = (label: string, charsPerLine: number, maxLines: number): string[] => {
  const normalized = (label || '').replace(/\s+/g, ' ').trim();

  if (!normalized) {
    return [''];
  }

  const words: string[] = [];
  normalized.split(' ').forEach((word) => {
    let remaining = word;
    while (remaining.length > charsPerLine) {
      words.push(remaining.slice(0, charsPerLine));
      remaining = remaining.slice(charsPerLine);
    }
    words.push(remaining);
  });

  const lines: string[] = [];
  let current = '';

  words.forEach((word) => {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= charsPerLine) {
      current = candidate;
      return;
    }
    if (current) {
      lines.push(current);
    }
    current = word;
  });

  if (current) {
    lines.push(current);
  }

  if (lines.length <= maxLines) {
    return lines;
  }

  const truncated = lines.slice(0, maxLines);
  const last = truncated[maxLines - 1];
  truncated[maxLines - 1] = `${last.slice(0, Math.max(0, charsPerLine - 1)).trimEnd()}…`;

  return truncated;
};

/**
 * Computes a left to right tidy layout for an attack tree.
 *
 * Depth maps to the horizontal axis, leaves are stacked top to bottom in
 * traversal order, and every parent is vertically centred on the span of its
 * children.
 */
const layoutAttackTree = (root: AttackTreeNode, options: Partial<AttackTreeLayoutOptions> = {}): AttackTreeLayout => {
  const opts: AttackTreeLayoutOptions = { ...DEFAULT_ATTACK_TREE_LAYOUT_OPTIONS, ...options };

  const nodes: AttackTreeLayoutNode[] = [];

  let nextLeafTop = 0;

  const visit = (node: AttackTreeNode, depth: number): AttackTreeLayoutNode => {
    const lines = wrapLabel(node.label, opts.charsPerLine, opts.maxLines);
    const hasFooter = !!(node.stride?.length || node.mitreTechniques?.length);
    const height =
      opts.paddingY * 2 + opts.headerHeight + lines.length * opts.lineHeight + (hasFooter ? opts.footerHeight : 0);

    const layoutNode: AttackTreeLayoutNode = {
      node,
      lines,
      hasFooter,
      depth,
      x: depth * (opts.nodeWidth + opts.horizontalGap),
      y: 0,
      width: opts.nodeWidth,
      height,
    };

    // Pushed before recursing so that nodes are returned in pre-order.
    nodes.push(layoutNode);

    const children = (node.children || []).map((child) => visit(child, depth + 1));

    if (children.length === 0) {
      layoutNode.y = nextLeafTop;
      nextLeafTop = layoutNode.y + height + opts.verticalGap;
    } else {
      const first = children[0];
      const last = children[children.length - 1];
      layoutNode.y = (first.y + last.y + last.height - height) / 2;
    }

    return layoutNode;
  };

  visit(root, 0);

  // Centring a parent on its children can push it above the canvas when the
  // parent is taller than the span of its children, so normalise the origin.
  const minY = nodes.reduce((min, n) => Math.min(min, n.y), 0);
  if (minY < 0) {
    nodes.forEach((n) => {
      n.y -= minY;
    });
  }

  const nodeById = nodes.reduce((all: { [id: string]: AttackTreeLayoutNode }, n) => {
    all[n.node.id] = n;
    return all;
  }, {});

  const edges: AttackTreeLayoutEdge[] = [];

  nodes.forEach((parent) => {
    (parent.node.children || []).forEach((childNode) => {
      const child = nodeById[childNode.id];
      if (!child) {
        return;
      }

      const startX = parent.x + parent.width;
      const startY = parent.y + parent.height / 2;
      const endX = child.x;
      const endY = child.y + child.height / 2;
      const midX = startX + (endX - startX) / 2;

      edges.push({
        id: `${parent.node.id}->${child.node.id}`,
        fromId: parent.node.id,
        toId: child.node.id,
        isDefensive: child.node.type === 'mitigation',
        path: `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`,
      });
    });
  });

  const width = nodes.reduce((max, n) => Math.max(max, n.x + n.width), 0);
  const height = nodes.reduce((max, n) => Math.max(max, n.y + n.height), 0);

  return { nodes, edges, width, height };
};

export default layoutAttackTree;

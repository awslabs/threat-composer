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
/** @jsxImportSource @emotion/react */
import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import SpaceBetween from '@cloudscape-design/components/space-between';
import * as awsui from '@cloudscape-design/design-tokens';
import { css } from '@emotion/react';
import { FC, MouseEvent as ReactMouseEvent, useCallback, useMemo, useRef, useState } from 'react';
import { AttackTreeNode, AttackTreeNodeType, AttackTreeRiskLevel } from '../../../customTypes';
import STRIDE from '../../../data/stride';
import layoutAttackTree, { AttackTreeLayoutNode } from '../../../utils/layoutAttackTree';
import sortStrideValues from '../../../utils/sortStrideValues';

const ZOOM_STEP = 0.15;
const MIN_ZOOM = 0.4;
const MAX_ZOOM = 2;

/**
 * Pointer movement in pixels that is treated as a pan rather than a click, so that
 * a small wobble while clicking a link does not swallow the click.
 */
const DRAG_THRESHOLD = 4;

const STRIDE_BADGE_RADIUS = 8;
const STRIDE_BADGE_GAP = 3;

const NODE_STYLES: {
  [key in AttackTreeNodeType]: { fill: string; stroke: string; accent: string };
} = {
  root: {
    fill: awsui.colorBackgroundStatusError,
    stroke: awsui.colorBorderStatusError,
    accent: awsui.colorTextStatusError,
  },
  impact: {
    fill: awsui.colorBackgroundStatusWarning,
    stroke: awsui.colorBorderStatusWarning,
    accent: awsui.colorTextStatusWarning,
  },
  threat: {
    fill: awsui.colorBackgroundStatusInfo,
    stroke: awsui.colorBorderStatusInfo,
    accent: awsui.colorTextStatusInfo,
  },
  prerequisite: {
    fill: awsui.colorBackgroundContainerContent,
    stroke: awsui.colorBorderDividerDefault,
    accent: awsui.colorTextBodySecondary,
  },
  mitigation: {
    fill: awsui.colorBackgroundStatusSuccess,
    stroke: awsui.colorBorderStatusSuccess,
    accent: awsui.colorTextStatusSuccess,
  },
};

const NODE_TYPE_LABEL: { [key in AttackTreeNodeType]: string } = {
  root: 'Goal',
  impact: 'Impact',
  threat: 'Threat',
  prerequisite: 'Prerequisite',
  mitigation: 'Mitigation',
};

const RISK_LEVEL_COLOR: { [key in AttackTreeRiskLevel]: string } = {
  'High': awsui.colorTextStatusError,
  'Medium': awsui.colorTextStatusWarning,
  'Low': awsui.colorTextStatusSuccess,
  'Not set': awsui.colorTextBodySecondary,
};

const STRIDE_BY_VALUE = STRIDE.reduce((all: { [value: string]: (typeof STRIDE)[number] }, cur) => {
  all[cur.value] = cur;
  return all;
}, {});

const scrollContainerStyles = (dragging: boolean) =>
  css({
    overflow: 'auto',
    maxHeight: '70vh',
    border: `1px solid ${awsui.colorBorderDividerDefault}`,
    borderRadius: awsui.borderRadiusContainer,
    padding: awsui.spaceScaledS,
    cursor: dragging ? 'grabbing' : 'grab',
    userSelect: dragging ? 'none' : undefined,
  });

const svgStyles = css({
  fontFamily: awsui.fontFamilyBase,
  display: 'block',
});

const entityLinkStyles = css({
  textDecoration: 'underline',
  cursor: 'pointer',
});

const getNodeHeader = (layoutNode: AttackTreeLayoutNode) => {
  const { node } = layoutNode;
  const parts: string[] = [];

  if (!node.displayId) {
    parts.push(NODE_TYPE_LABEL[node.type]);
  }

  if (node.operator && node.children?.length) {
    parts.push(node.operator);
  }

  if (node.riskLevel && node.riskLevel !== 'Not set') {
    parts.push(`Risk ${node.riskLevel}`);
  }

  if (node.metrics) {
    parts.push(`${node.metrics.threats} threats`);
  }

  return parts.join(' · ');
};

export interface AttackTreeDiagramProps {
  tree: AttackTreeNode;
  /**
   * Invoked when a node backed by a threat or mitigation is clicked. Used to open
   * the entity in the threats or mitigations section.
   */
  onNodeSelect?: (node: AttackTreeNode) => void;
}

/**
 * Renders an attack tree as a left to right SVG diagram. The geometry is computed
 * by layoutAttackTree so that this component stays presentational.
 *
 * The canvas can be panned by clicking and holding anywhere on the background, and
 * zoomed with the toolbar buttons.
 */
const AttackTreeDiagram: FC<AttackTreeDiagramProps> = ({ tree, onNodeSelect }) => {
  const [zoom, setZoom] = useState(1);
  const [dragging, setDragging] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const dragOrigin = useRef<{ x: number; y: number; scrollLeft: number; scrollTop: number } | null>(null);
  const dragDistance = useRef(0);

  const layout = useMemo(() => layoutAttackTree(tree), [tree]);

  const handleZoomIn = useCallback(() => setZoom((z) => Math.min(MAX_ZOOM, z + ZOOM_STEP)), []);
  const handleZoomOut = useCallback(() => setZoom((z) => Math.max(MIN_ZOOM, z - ZOOM_STEP)), []);
  const handleZoomReset = useCallback(() => setZoom(1), []);

  const handleMouseDown = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    // Only the primary button pans, so context menus and middle click are untouched.
    if (event.button !== 0 || !scrollRef.current) {
      return;
    }

    dragOrigin.current = {
      x: event.clientX,
      y: event.clientY,
      scrollLeft: scrollRef.current.scrollLeft,
      scrollTop: scrollRef.current.scrollTop,
    };
    dragDistance.current = 0;
    setDragging(true);
  }, []);

  const handleMouseMove = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    const origin = dragOrigin.current;
    if (!origin || !scrollRef.current) {
      return;
    }

    const deltaX = event.clientX - origin.x;
    const deltaY = event.clientY - origin.y;

    dragDistance.current = Math.max(dragDistance.current, Math.abs(deltaX) + Math.abs(deltaY));

    if (dragDistance.current < DRAG_THRESHOLD) {
      return;
    }

    // Dragging left moves the content left, which means scrolling right.
    scrollRef.current.scrollLeft = origin.scrollLeft - deltaX;
    scrollRef.current.scrollTop = origin.scrollTop - deltaY;

    // Suppress text selection while panning.
    event.preventDefault();
  }, []);

  const handleMouseUp = useCallback(() => {
    dragOrigin.current = null;
    setDragging(false);
  }, []);

  const handleNodeClick = useCallback(
    (node: AttackTreeNode) => {
      // A click that ended a pan should not also activate the node.
      if (dragDistance.current >= DRAG_THRESHOLD) {
        return;
      }

      if (onNodeSelect && node.entityId) {
        onNodeSelect(node);
      }
    },
    [onNodeSelect],
  );

  const padding = 8;
  const width = layout.width + padding * 2;
  const height = layout.height + padding * 2;

  return (
    <SpaceBetween direction="vertical" size="xs">
      <SpaceBetween direction="horizontal" size="xs" alignItems="center">
        <Button iconName="zoom-out" ariaLabel="Zoom out" onClick={handleZoomOut} disabled={zoom <= MIN_ZOOM} />
        <Button iconName="zoom-in" ariaLabel="Zoom in" onClick={handleZoomIn} disabled={zoom >= MAX_ZOOM} />
        <Button onClick={handleZoomReset} disabled={zoom === 1}>
          Reset zoom
        </Button>
        <Box variant="small" color="text-body-secondary">
          {`${Math.round(zoom * 100)}% · click and hold to pan`}
        </Box>
      </SpaceBetween>
      <div
        ref={scrollRef}
        css={scrollContainerStyles(dragging)}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <svg
          css={svgStyles}
          role="img"
          aria-label={`Attack tree for ${tree.label}`}
          width={width * zoom}
          height={height * zoom}
          viewBox={`${-padding} ${-padding} ${width} ${height}`}
        >
          <g>
            {layout.edges.map((edge) => (
              <path
                key={edge.id}
                d={edge.path}
                fill="none"
                stroke={awsui.colorBorderDividerDefault}
                strokeWidth={1.5}
                strokeDasharray={edge.isDefensive ? '6 4' : undefined}
              >
                {edge.isDefensive && <title>Mitigated by (defensive control, not an attack prerequisite)</title>}
              </path>
            ))}
          </g>
          <g>
            {layout.nodes.map((layoutNode) => {
              const { node } = layoutNode;
              const styles = NODE_STYLES[node.type];
              const interactive = !!(onNodeSelect && node.entityId);
              const header = getNodeHeader(layoutNode);
              // Sorted so the badges always read in canonical STRIDE order, whatever
              // order the categories were recorded in.
              const strideValues = sortStrideValues(node.stride);
              const techniques = node.mitreTechniques || [];
              const footerY = layoutNode.height - 8;

              return (
                <g key={node.id} transform={`translate(${layoutNode.x}, ${layoutNode.y})`}>
                  <title>{node.tooltip || node.label}</title>
                  <rect
                    width={layoutNode.width}
                    height={layoutNode.height}
                    rx={8}
                    ry={8}
                    fill={styles.fill}
                    stroke={styles.stroke}
                    strokeWidth={node.type === 'root' ? 2 : 1}
                  />
                  {node.displayId && (
                    <text
                      x={12}
                      y={18}
                      fontSize={11}
                      fontWeight="bold"
                      fill={interactive ? awsui.colorTextInteractiveDefault : styles.accent}
                      css={interactive ? entityLinkStyles : undefined}
                      onClick={interactive ? () => handleNodeClick(node) : undefined}
                      onKeyDown={
                        interactive
                          ? (event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              onNodeSelect?.(node);
                            }
                          }
                          : undefined
                      }
                      tabIndex={interactive ? 0 : undefined}
                      role={interactive ? 'link' : undefined}
                      aria-label={
                        interactive
                          ? `Open ${node.displayId} in the ${node.type === 'threat' ? 'threats' : 'mitigations'} section`
                          : undefined
                      }
                    >
                      {node.displayId}
                    </text>
                  )}
                  {header && (
                    <text
                      x={node.displayId ? 12 + node.displayId.length * 6.6 + 6 : 12}
                      y={18}
                      fontSize={11}
                      fill={styles.accent}
                    >
                      {header}
                    </text>
                  )}
                  {layoutNode.lines.map((line, index) => (
                    <text
                      key={`${node.id}-line-${index}`}
                      x={12}
                      y={36 + index * 15}
                      fontSize={12}
                      fill={awsui.colorTextBodyDefault}
                    >
                      {line}
                    </text>
                  ))}
                  {techniques.length > 0 && (
                    <g>
                      {techniques.slice(0, 3).map((technique, index) => (
                        <a
                          key={technique.id}
                          href={technique.url}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <title>
                            {`MITRE ATT&CK ${technique.id}${technique.name ? `: ${technique.name}` : ''}${
                              technique.source === 'suggested' ? ' (suggested from keywords, confirm before relying on it)' : ''
                            }`}
                          </title>
                          <text
                            x={12 + index * 52}
                            y={footerY}
                            fontSize={10}
                            fill={awsui.colorTextInteractiveDefault}
                            fontStyle={technique.source === 'suggested' ? 'italic' : undefined}
                            css={entityLinkStyles}
                          >
                            {technique.id}
                          </text>
                        </a>
                      ))}
                      {techniques.length > 3 && (
                        <text
                          x={12 + 3 * 52}
                          y={footerY}
                          fontSize={10}
                          fill={awsui.colorTextBodySecondary}
                        >
                          <title>{techniques.map((t) => t.id).join(', ')}</title>
                          {`+${techniques.length - 3}`}
                        </text>
                      )}
                    </g>
                  )}
                  {strideValues.length > 0 && (
                    <g>
                      {strideValues.map((value, index) => {
                        const stride = STRIDE_BY_VALUE[value];
                        const fromRight = strideValues.length - 1 - index;
                        const cx =
                          layoutNode.width - 12 - STRIDE_BADGE_RADIUS - fromRight * (STRIDE_BADGE_RADIUS * 2 + STRIDE_BADGE_GAP);

                        return (
                          <g key={`${node.id}-stride-${value}`}>
                            <title>
                              {stride ? `STRIDE ${stride.label} · violates ${stride.violates}` : `STRIDE ${value}`}
                            </title>
                            <circle
                              cx={cx}
                              cy={footerY - 4}
                              r={STRIDE_BADGE_RADIUS}
                              fill={styles.accent}
                              opacity={0.15}
                              stroke={styles.accent}
                            />
                            <text
                              x={cx}
                              y={footerY}
                              fontSize={10}
                              fontWeight="bold"
                              textAnchor="middle"
                              fill={styles.accent}
                            >
                              {value}
                            </text>
                          </g>
                        );
                      })}
                    </g>
                  )}
                  {node.riskLevel && node.riskLevel !== 'Not set' && (
                    <rect
                      x={0}
                      y={0}
                      width={4}
                      height={layoutNode.height}
                      rx={2}
                      ry={2}
                      fill={RISK_LEVEL_COLOR[node.riskLevel]}
                    />
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      </div>
      {layout.edges.some((edge) => edge.isDefensive) && (
        <Box variant="small" color="text-body-secondary">
          Dashed links: mitigated by (defensive controls, not attack prerequisites).
        </Box>
      )}
    </SpaceBetween>
  );
};

export default AttackTreeDiagram;

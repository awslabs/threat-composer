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
import { render, screen, cleanup } from '@testing-library/react';
import AttackTreeDiagram from '.';
import { AttackTreeNode } from '../../../customTypes';

const tree: AttackTreeNode = {
  id: 'threat',
  label: 'Read records',
  type: 'threat',
  children: [
    { id: 'prerequisite', label: 'Console access', type: 'prerequisite' },
    { id: 'mitigation', label: 'Least privilege', type: 'mitigation' },
  ],
};

/**
 * A mitigation is a defensive control, not a step the attacker must complete.
 * Rendering its edge like a prerequisite would claim the attack depends on it,
 * so these assertions pin the distinction rather than the styling.
 */
describe('AttackTreeDiagram defensive links', () => {
  afterEach(cleanup);

  test.each(['AND', 'OR', undefined] as const)(
    'dashes only mitigation paths under %p and explains their meaning',
    (operator) => {
      const { container } = render(
        <AttackTreeDiagram tree={{ ...tree, operator }} />,
      );
      // Scoped to the diagram canvas: the toolbar's Cloudscape icons are SVG
      // paths too, and would otherwise be counted as edges.
      const paths = Array.from(
        screen.getByRole('img').querySelectorAll('path'),
      );

      expect(paths).toHaveLength(2);
      expect(paths[0].getAttribute('stroke-dasharray')).toBeNull();
      expect(paths[1].getAttribute('stroke-dasharray')).toBe('6 4');
      expect(paths[1].querySelector('title')?.textContent).toBe(
        'Mitigated by (defensive control, not an attack prerequisite)',
      );
      expect(container.textContent).toContain(
        'Dashed links: mitigated by (defensive controls, not attack prerequisites).',
      );
    },
  );

  test('omits the defensive legend when there are no mitigation links', () => {
    const { container } = render(
      <AttackTreeDiagram
        tree={{ ...tree, children: tree.children!.slice(0, 1) }}
      />,
    );

    expect(
      screen.getByRole('img').querySelector('[stroke-dasharray]'),
    ).toBeNull();
    expect(container.textContent).not.toContain('Dashed links:');
    expect(container.textContent).not.toContain('Mitigated by');
  });
});

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
import userEvent from '@testing-library/user-event';
import AssumptionLinkView from '.';
import { Assumption } from '../../../customTypes';

const first: Assumption = {
  id: '55555555-5555-4555-8555-555555555555',
  numericId: 3,
  content: 'The network is trusted',
  metadata: [{ key: 'Comments', value: 'Confirmed with the network team' }],
};

const second: Assumption = {
  id: '66666666-6666-4666-8666-666666666666',
  numericId: 14,
  content: 'Only staff have access',
};

const unlinked: Assumption = {
  id: '77777777-7777-4777-8777-777777777777',
  numericId: 8,
  content: 'Not linked',
};

describe('AssumptionLinkView', () => {
  afterEach(cleanup);

  const renderView = (props: Partial<Parameters<typeof AssumptionLinkView>[0]> = {}) => render(
    <AssumptionLinkView
      linkedAssumptionIds={[first.id, second.id]}
      assumptionList={[first, second, unlinked]}
      onAddAssumptionLink={vi.fn()}
      onRemoveAssumptionLink={vi.fn()}
      {...props}
    />,
  );

  it('shows the id and the content of each linked assumption', () => {
    renderView();
    expect(screen.getByText('A-0003')).toBeInTheDocument();
    expect(screen.getByText('The network is trusted')).toBeInTheDocument();
    expect(screen.getByText('A-0014')).toBeInTheDocument();
    expect(screen.getByText('Only staff have access')).toBeInTheDocument();
    expect(screen.queryByText('Not linked')).not.toBeInTheDocument();
  });

  it('shows the number of linked assumptions in the header', () => {
    renderView();
    expect(screen.getByText('Linked assumptions (2)')).toBeInTheDocument();
  });

  it('uses the comments of an assumption as its hover text', () => {
    renderView();
    expect(screen.getByText('The network is trusted').closest('[title]'))
      .toHaveAttribute('title', 'Confirmed with the network team');
    expect(screen.getByText('Only staff have access').closest('[title]')).toBeNull();
  });

  it('shows the ids as plain text without a navigation callback', () => {
    renderView();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('shows the ids as links that pass the assumption id to the navigation callback', async () => {
    const onViewAssumption = vi.fn();
    renderView({ onViewAssumption });

    await userEvent.click(screen.getByRole('link', { name: 'A-0014' }));
    expect(onViewAssumption).toHaveBeenCalledWith(second.id);
  });

  it('unlinks the assumption from the button named after its number', async () => {
    const onRemoveAssumptionLink = vi.fn();
    renderView({ onRemoveAssumptionLink });

    await userEvent.click(screen.getByRole('button', { name: 'Unlink assumption 3' }));
    expect(onRemoveAssumptionLink).toHaveBeenCalledWith(first.id);
  });
});

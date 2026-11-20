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
import MitigationLinkView from '.';
import { Mitigation } from '../../../customTypes';

const resolved: Mitigation = {
  id: '11111111-1111-4111-8111-111111111111',
  numericId: 15,
  content: 'Encrypt the data at rest',
  status: 'mitigationResolved',
  metadata: [{ key: 'Comments', value: 'Done in the 2.3 release' }],
};

const inProgress: Mitigation = {
  id: '22222222-2222-4222-8222-222222222222',
  numericId: 2,
  content: 'Rotate the signing keys',
  status: 'mitigationInProgress',
};

const noStatus: Mitigation = {
  id: '33333333-3333-4333-8333-333333333333',
  numericId: 120,
  content: 'Add rate limiting',
};

const unlinked: Mitigation = {
  id: '44444444-4444-4444-8444-444444444444',
  numericId: 9,
  content: 'Not linked',
};

describe('MitigationLinkView', () => {
  afterEach(cleanup);

  const renderView = (props: Partial<Parameters<typeof MitigationLinkView>[0]> = {}) => render(
    <MitigationLinkView
      linkedMitigationIds={[resolved.id, inProgress.id, noStatus.id]}
      mitigationList={[resolved, inProgress, noStatus, unlinked]}
      onAddMitigationLink={vi.fn()}
      onRemoveMitigationLink={vi.fn()}
      {...props}
    />,
  );

  it('shows the id of each linked mitigation in the markdown export format', () => {
    renderView();
    expect(screen.getByText('M-0015')).toBeInTheDocument();
    expect(screen.getByText('M-0002')).toBeInTheDocument();
    expect(screen.getByText('M-0120')).toBeInTheDocument();
  });

  it('shows the content of each linked mitigation but not of an unlinked one', () => {
    renderView();
    expect(screen.getByText('Encrypt the data at rest')).toBeInTheDocument();
    expect(screen.getByText('Rotate the signing keys')).toBeInTheDocument();
    expect(screen.queryByText('Not linked')).not.toBeInTheDocument();
  });

  it('shows the status of each linked mitigation', () => {
    renderView();
    expect(screen.getByText('Resolved')).toBeInTheDocument();
    expect(screen.getByText('In-progress')).toBeInTheDocument();
    expect(screen.getByText('Status Not Set')).toBeInTheDocument();
  });

  it('shows the number of resolved mitigations in the header', () => {
    renderView();
    expect(screen.getByText('Linked mitigations (3) · 1 resolved')).toBeInTheDocument();
  });

  it('shows 0 resolved when no linked mitigation is resolved', () => {
    renderView({ linkedMitigationIds: [inProgress.id] });
    expect(screen.getByText('Linked mitigations (1) · 0 resolved')).toBeInTheDocument();
  });

  it('has no resolved count when nothing is linked', () => {
    renderView({ linkedMitigationIds: [] });
    expect(screen.getByText('Linked mitigations (0)')).toBeInTheDocument();
  });

  it('uses the comments of a mitigation as its hover text', () => {
    renderView();
    expect(screen.getByText('Encrypt the data at rest').closest('[title]'))
      .toHaveAttribute('title', 'Done in the 2.3 release');
    expect(screen.getByText('Rotate the signing keys').closest('[title]')).toBeNull();
  });

  it('shows the ids as plain text without a navigation callback', () => {
    renderView();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('shows the ids as links that pass the mitigation id to the navigation callback', async () => {
    const onViewMitigation = vi.fn();
    renderView({ onViewMitigation });

    await userEvent.click(screen.getByRole('link', { name: 'M-0002' }));
    expect(onViewMitigation).toHaveBeenCalledWith(inProgress.id);
  });

  it('unlinks the mitigation from the button named after its number', async () => {
    const onRemoveMitigationLink = vi.fn();
    renderView({ onRemoveMitigationLink });

    await userEvent.click(screen.getByRole('button', { name: 'Unlink mitigation 15' }));
    expect(onRemoveMitigationLink).toHaveBeenCalledWith(resolved.id);
  });
});

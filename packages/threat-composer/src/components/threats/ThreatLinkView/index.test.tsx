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
import ThreatLinkView from '.';
import { TemplateThreatStatement } from '../../../customTypes';

const identified: TemplateThreatStatement = {
  id: '88888888-8888-4888-8888-888888888888',
  numericId: 7,
  statement: 'An attacker can read the stored data',
  status: 'threatIdentified',
  metadata: [{ key: 'Comments', value: 'Reported by the pen test' }],
};

const notUseful: TemplateThreatStatement = {
  id: '99999999-9999-4999-8999-999999999999',
  numericId: 21,
  statement: 'A user can reboot the server',
  status: 'threatResolvedNotUseful',
};

const noStatus: TemplateThreatStatement = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  numericId: 4,
  statement: 'An attacker can replay a request',
};

const unlinked: TemplateThreatStatement = {
  id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  numericId: 1,
  statement: 'Not linked',
};

describe('ThreatLinkView', () => {
  afterEach(cleanup);

  const renderView = (props: Partial<Parameters<typeof ThreatLinkView>[0]> = {}) => render(
    <ThreatLinkView
      linkedThreatIds={[identified.id, notUseful.id, noStatus.id]}
      threatList={[identified, notUseful, noStatus, unlinked]}
      onAddThreatLink={vi.fn()}
      onRemoveThreatLink={vi.fn()}
      {...props}
    />,
  );

  it('shows the id of each linked threat in the markdown export format', () => {
    renderView();
    expect(screen.getByText('T-0007')).toBeInTheDocument();
    expect(screen.getByText('T-0021')).toBeInTheDocument();
    expect(screen.getByText('T-0004')).toBeInTheDocument();
  });

  it('shows the statement of each linked threat but not of an unlinked one', () => {
    renderView();
    expect(screen.getByText('An attacker can read the stored data')).toBeInTheDocument();
    expect(screen.getByText('A user can reboot the server')).toBeInTheDocument();
    expect(screen.queryByText('Not linked')).not.toBeInTheDocument();
  });

  it('shows the status of each linked threat', () => {
    renderView();
    expect(screen.getByText('Identified')).toBeInTheDocument();
    expect(screen.getByText('Not Useful')).toBeInTheDocument();
    expect(screen.getByText('Status Not Set')).toBeInTheDocument();
  });

  it('shows the number of linked threats in the header', () => {
    renderView();
    expect(screen.getByText('Linked threats (3)')).toBeInTheDocument();
  });

  it('uses the comments of a threat as its hover text', () => {
    renderView();
    expect(screen.getByText('An attacker can read the stored data').closest('[title]'))
      .toHaveAttribute('title', 'Reported by the pen test');
    expect(screen.getByText('A user can reboot the server').closest('[title]')).toBeNull();
  });

  it('shows the ids as plain text without a navigation callback', () => {
    renderView();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('shows the ids as links that pass the threat id to the navigation callback', async () => {
    const onViewThreat = vi.fn();
    renderView({ onViewThreat });

    await userEvent.click(screen.getByRole('link', { name: 'T-0021' }));
    expect(onViewThreat).toHaveBeenCalledWith(notUseful.id);
  });

  it('unlinks the threat from the button named after its number', async () => {
    const onRemoveThreatLink = vi.fn();
    renderView({ onRemoveThreatLink });

    await userEvent.click(screen.getByRole('button', { name: 'Unlink threat 7' }));
    expect(onRemoveThreatLink).toHaveBeenCalledWith(identified.id);
  });
});

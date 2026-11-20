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
import LinkedEntityItem, { getEntityComments, LinkedEntityStatus } from '.';

describe('getEntityComments', () => {
  it('returns the Comments metadata', () => {
    expect(getEntityComments({
      metadata: [{ key: 'custom:owner', value: 'team a' }, { key: 'Comments', value: 'Needs review' }],
    })).toBe('Needs review');
  });

  it('returns undefined when there is no metadata', () => {
    expect(getEntityComments({})).toBeUndefined();
    expect(getEntityComments({ metadata: [] })).toBeUndefined();
  });

  it('returns undefined when the comments are empty or only whitespace', () => {
    expect(getEntityComments({ metadata: [{ key: 'Comments', value: '' }] })).toBeUndefined();
    expect(getEntityComments({ metadata: [{ key: 'Comments', value: '   ' }] })).toBeUndefined();
  });

  it('returns undefined when the value is not a string', () => {
    expect(getEntityComments({ metadata: [{ key: 'Comments', value: ['a', 'b'] }] })).toBeUndefined();
  });
});

describe('LinkedEntityStatus', () => {
  afterEach(cleanup);

  const options = [{ value: 'done', label: 'Done' }];

  it('shows the label of the status', () => {
    render(<LinkedEntityStatus status='done' options={options} colorMapping={{}} />);
    expect(screen.getByText('Done')).toBeInTheDocument();
  });

  it('shows "Status Not Set" when there is no status or the status is unknown', () => {
    const { rerender } = render(<LinkedEntityStatus options={options} colorMapping={{}} />);
    expect(screen.getByText('Status Not Set')).toBeInTheDocument();

    rerender(<LinkedEntityStatus status='other' options={options} colorMapping={{}} />);
    expect(screen.getByText('Status Not Set')).toBeInTheDocument();
  });
});

describe('LinkedEntityItem', () => {
  afterEach(cleanup);

  const baseProps = {
    displayId: 'M-0015',
    content: 'Encrypt the data at rest',
    dismissLabel: 'Unlink mitigation 15',
    onDismiss: vi.fn(),
  };

  it('shows the id and the content', () => {
    render(<LinkedEntityItem {...baseProps} />);
    expect(screen.getByText('M-0015')).toBeInTheDocument();
    expect(screen.getByText('Encrypt the data at rest')).toBeInTheDocument();
  });

  it('shows the id as plain text when there is no navigation callback', () => {
    render(<LinkedEntityItem {...baseProps} />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('shows the id as a link that calls the navigation callback', async () => {
    const onNavigate = vi.fn();
    render(<LinkedEntityItem {...baseProps} onNavigate={onNavigate} />);

    await userEvent.click(screen.getByRole('link', { name: 'M-0015' }));
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });

  it('uses the comments as hover text and not the content', () => {
    render(<LinkedEntityItem {...baseProps} comments='Waiting for the key rotation work' />);
    const hoverTarget = screen.getByText('Encrypt the data at rest').closest('[title]');
    expect(hoverTarget).toHaveAttribute('title', 'Waiting for the key rotation work');
  });

  it('has no hover text when there are no comments', () => {
    render(<LinkedEntityItem {...baseProps} />);
    expect(screen.getByText('Encrypt the data at rest').closest('[title]')).toBeNull();
  });

  it('renders the status', () => {
    render(<LinkedEntityItem {...baseProps} status={<span>Resolved</span>} />);
    expect(screen.getByText('Resolved')).toBeInTheDocument();
  });

  it('calls onDismiss from the button with the dismiss label', async () => {
    const onDismiss = vi.fn();
    render(<LinkedEntityItem {...baseProps} onDismiss={onDismiss} />);

    await userEvent.click(screen.getByRole('button', { name: 'Unlink mitigation 15' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});

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
import MitigationList from '.';
import { MitigationsContext, MitigationsContextApi } from '../../../contexts/MitigationsContext/context';
import { Mitigation } from '../../../customTypes';

const first: Mitigation = {
  id: '11111111-1111-4111-8111-111111111111',
  numericId: 1,
  content: 'Encrypt the data at rest',
};

const second: Mitigation = {
  id: '22222222-2222-4222-8222-222222222222',
  numericId: 2,
  content: 'Rotate the signing keys',
};

const context: MitigationsContextApi = {
  mitigationList: [first, second],
  setMitigationList: vi.fn(),
  removeMitigation: vi.fn(),
  saveMitigation: vi.fn(),
  removeAllMitigations: vi.fn(),
  onDeleteWorkspace: vi.fn(),
};

const renderList = (initialFilter?: Parameters<typeof MitigationList>[0]['initialFilter']) => render(
  <MitigationsContext.Provider value={context}>
    <MitigationList initialFilter={initialFilter} />
  </MitigationsContext.Provider>,
);

describe('MitigationList', () => {
  afterEach(cleanup);

  it('shows every mitigation without a filter', () => {
    renderList();
    expect(screen.getByText('Encrypt the data at rest')).toBeInTheDocument();
    expect(screen.getByText('Rotate the signing keys')).toBeInTheDocument();
    expect(screen.queryByText(/Showing only mitigation/)).not.toBeInTheDocument();
  });

  it('shows only the mitigation named by the id filter and says so', () => {
    renderList({ id: second.id });
    expect(screen.getByText('Rotate the signing keys')).toBeInTheDocument();
    expect(screen.queryByText('Encrypt the data at rest')).not.toBeInTheDocument();
    expect(screen.getByText(/Showing only mitigation M-0002/)).toBeInTheDocument();
  });

  it('enables Clear filters for the id filter and shows every mitigation again after it', async () => {
    renderList({ id: second.id });
    const clear = screen.getByRole('button', { name: 'Clear filters' });
    expect(clear).toBeEnabled();

    await userEvent.click(clear);
    expect(screen.getByText('Encrypt the data at rest')).toBeInTheDocument();
    expect(screen.getByText('Rotate the signing keys')).toBeInTheDocument();
    expect(screen.queryByText(/Showing only mitigation/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear filters' })).toBeDisabled();
  });

  it('shows no mitigation when the id filter names a mitigation that does not exist', () => {
    renderList({ id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd' });
    expect(screen.queryByText('Encrypt the data at rest')).not.toBeInTheDocument();
    expect(screen.queryByText('Rotate the signing keys')).not.toBeInTheDocument();
  });
});

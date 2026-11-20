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
import AssumptionList from '.';
import { AssumptionsContext, AssumptionsContextApi } from '../../../contexts/AssumptionsContext/context';
import { Assumption } from '../../../customTypes';

const first: Assumption = {
  id: '55555555-5555-4555-8555-555555555555',
  numericId: 1,
  content: 'The network is trusted',
};

const second: Assumption = {
  id: '66666666-6666-4666-8666-666666666666',
  numericId: 2,
  content: 'Only staff have access',
};

const context: AssumptionsContextApi = {
  assumptionList: [first, second],
  setAssumptionList: vi.fn(),
  removeAssumption: vi.fn(),
  saveAssumption: vi.fn(),
  removeAllAssumptions: vi.fn(),
  onDeleteWorkspace: vi.fn(),
};

const renderList = (initialFilter?: Parameters<typeof AssumptionList>[0]['initialFilter']) => render(
  <AssumptionsContext.Provider value={context}>
    <AssumptionList initialFilter={initialFilter} />
  </AssumptionsContext.Provider>,
);

describe('AssumptionList', () => {
  afterEach(cleanup);

  it('shows every assumption without a filter', () => {
    renderList();
    expect(screen.getByText('The network is trusted')).toBeInTheDocument();
    expect(screen.getByText('Only staff have access')).toBeInTheDocument();
    expect(screen.queryByText(/Showing only assumption/)).not.toBeInTheDocument();
  });

  it('shows only the assumption named by the id filter and says so', () => {
    renderList({ id: second.id });
    expect(screen.getByText('Only staff have access')).toBeInTheDocument();
    expect(screen.queryByText('The network is trusted')).not.toBeInTheDocument();
    expect(screen.getByText(/Showing only assumption A-0002/)).toBeInTheDocument();
  });

  it('enables Clear filters for the id filter and shows every assumption again after it', async () => {
    renderList({ id: second.id });
    const clear = screen.getByRole('button', { name: 'Clear filters' });
    expect(clear).toBeEnabled();

    await userEvent.click(clear);
    expect(screen.getByText('The network is trusted')).toBeInTheDocument();
    expect(screen.getByText('Only staff have access')).toBeInTheDocument();
    expect(screen.queryByText(/Showing only assumption/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear filters' })).toBeDisabled();
  });

  it('shows no assumption when the id filter names an assumption that does not exist', () => {
    renderList({ id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd' });
    expect(screen.queryByText('The network is trusted')).not.toBeInTheDocument();
    expect(screen.queryByText('Only staff have access')).not.toBeInTheDocument();
  });
});

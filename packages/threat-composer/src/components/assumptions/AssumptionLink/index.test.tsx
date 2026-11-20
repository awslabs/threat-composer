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
import AssumptionLink from '.';
import { AssumptionLinksContext, AssumptionLinksContextApi } from '../../../contexts/AssumptionLinksContext/context';
import { AssumptionsContext, AssumptionsContextApi } from '../../../contexts/AssumptionsContext/context';
import ViewNavigationContextProvider from '../../../contexts/ViewNavigationContext';
import { Assumption, AssumptionLink as AssumptionLinkType } from '../../../customTypes';

const THREAT_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

const assumption: Assumption = {
  id: '55555555-5555-4555-8555-555555555555',
  numericId: 3,
  content: 'The network is trusted',
};

const link: AssumptionLinkType = { type: 'Threat', linkedId: THREAT_ID, assumptionId: assumption.id };

const assumptionsContext: AssumptionsContextApi = {
  assumptionList: [assumption],
  setAssumptionList: vi.fn(),
  removeAssumption: vi.fn(),
  saveAssumption: vi.fn(),
  removeAllAssumptions: vi.fn(),
  onDeleteWorkspace: vi.fn(),
};

const linksContext: AssumptionLinksContextApi = {
  assumptionLinkList: [link],
  setAssumptionLinkList: vi.fn(),
  getLinkedAssumptionLinks: () => [link],
  getAssumptionEntityLinks: () => [link],
  removeAssumptionLink: vi.fn(),
  removeAssumptionLinksByAssumptionId: vi.fn(),
  removeAssumptionLinksByLinkedEntityId: vi.fn(),
  removeAssumptionLinks: vi.fn(),
  addAssumptionLink: vi.fn(),
  addAssumptionLinks: vi.fn(),
  removeAllAssumptionLinks: vi.fn(),
  onDeleteWorkspace: vi.fn(),
};

const renderLink = (onAssumptionView?: (id: string) => void, withProvider = true) => {
  const content = (
    <AssumptionsContext.Provider value={assumptionsContext}>
      <AssumptionLinksContext.Provider value={linksContext}>
        <AssumptionLink linkedEntityId={THREAT_ID} type='Threat' />
      </AssumptionLinksContext.Provider>
    </AssumptionsContext.Provider>
  );

  return render(withProvider ? (
    <ViewNavigationContextProvider onAssumptionView={onAssumptionView}>{content}</ViewNavigationContextProvider>
  ) : content);
};

describe('AssumptionLink', () => {
  afterEach(cleanup);

  it('shows the linked assumption with its id', () => {
    renderLink();
    expect(screen.getByText('A-0003')).toBeInTheDocument();
    expect(screen.getByText('The network is trusted')).toBeInTheDocument();
  });

  it('makes the id a link that calls onAssumptionView from the navigation context', async () => {
    const onAssumptionView = vi.fn();
    renderLink(onAssumptionView);

    await userEvent.click(screen.getByRole('link', { name: 'A-0003' }));
    expect(onAssumptionView).toHaveBeenCalledWith(assumption.id);
  });

  it('shows the id as plain text when the provider has no onAssumptionView', () => {
    renderLink(undefined);
    expect(screen.getByText('A-0003')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('shows the id as plain text when there is no navigation provider', () => {
    renderLink(undefined, false);
    expect(screen.getByText('A-0003')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});

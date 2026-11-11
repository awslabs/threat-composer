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
import MitigationLink from '.';
import { MitigationLinksContext, MitigationLinksContextApi } from '../../../contexts/MitigationLinksContext/context';
import { MitigationsContext, MitigationsContextApi } from '../../../contexts/MitigationsContext/context';
import ViewNavigationContextProvider from '../../../contexts/ViewNavigationContext';
import { Mitigation, MitigationLink as MitigationLinkType } from '../../../customTypes';

const THREAT_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

const mitigation: Mitigation = {
  id: '11111111-1111-4111-8111-111111111111',
  numericId: 15,
  content: 'Encrypt the data at rest',
  status: 'mitigationResolved',
};

const link: MitigationLinkType = { linkedId: THREAT_ID, mitigationId: mitigation.id };

const mitigationsContext: MitigationsContextApi = {
  mitigationList: [mitigation],
  setMitigationList: vi.fn(),
  removeMitigation: vi.fn(),
  saveMitigation: vi.fn(),
  removeAllMitigations: vi.fn(),
  onDeleteWorkspace: vi.fn(),
};

const linksContext: MitigationLinksContextApi = {
  mitigationLinkList: [link],
  setMitigationLinkList: vi.fn(),
  getLinkedMitigationLinks: () => [link],
  getMitigtaionThreatLinks: () => [link],
  removeMitigationLink: vi.fn(),
  removeMitigationLinksByMitigationId: vi.fn(),
  removeMitigationLinksByLinkedEntityId: vi.fn(),
  removeMitigationLinks: vi.fn(),
  addMitigationLink: vi.fn(),
  addMitigationLinks: vi.fn(),
  removeAllMitigationLinks: vi.fn(),
  onDeleteWorkspace: vi.fn(),
};

const renderLink = (onMitigationView?: (id: string) => void, withProvider = true) => {
  const content = (
    <MitigationsContext.Provider value={mitigationsContext}>
      <MitigationLinksContext.Provider value={linksContext}>
        <MitigationLink linkedEntityId={THREAT_ID} />
      </MitigationLinksContext.Provider>
    </MitigationsContext.Provider>
  );

  return render(withProvider ? (
    <ViewNavigationContextProvider onMitigationView={onMitigationView}>{content}</ViewNavigationContextProvider>
  ) : content);
};

describe('MitigationLink', () => {
  afterEach(cleanup);

  it('shows the linked mitigation with its id and status', () => {
    renderLink();
    expect(screen.getByText('M-0015')).toBeInTheDocument();
    expect(screen.getByText('Encrypt the data at rest')).toBeInTheDocument();
    expect(screen.getByText('Resolved')).toBeInTheDocument();
  });

  it('makes the id a link that calls onMitigationView from the navigation context', async () => {
    const onMitigationView = vi.fn();
    renderLink(onMitigationView);

    await userEvent.click(screen.getByRole('link', { name: 'M-0015' }));
    expect(onMitigationView).toHaveBeenCalledWith(mitigation.id);
  });

  it('shows the id as plain text when the provider has no onMitigationView', () => {
    renderLink(undefined);
    expect(screen.getByText('M-0015')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('shows the id as plain text when there is no navigation provider', () => {
    renderLink(undefined, false);
    expect(screen.getByText('M-0015')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});

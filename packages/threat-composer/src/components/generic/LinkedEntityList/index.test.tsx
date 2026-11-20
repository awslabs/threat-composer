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
import { useState } from 'react';
import LinkedEntityList, { LinkedEntityListItem } from '.';

const makeItems = (ids: number[], onDismiss: (id: string) => void = () => undefined): LinkedEntityListItem[] =>
  ids.map(n => ({
    id: `id-${n}`,
    displayId: `M-000${n}`,
    content: `Content ${n}`,
    dismissLabel: `Unlink mitigation ${n}`,
    onNavigate: () => undefined,
    onDismiss: () => onDismiss(`id-${n}`),
  }));

describe('LinkedEntityList', () => {
  afterEach(cleanup);

  it('renders nothing when there are no items', () => {
    const { container } = render(<LinkedEntityList items={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a list with the size and position of each item', () => {
    render(<LinkedEntityList items={makeItems([1, 2, 3])} />);

    expect(screen.getByRole('list')).toBeInTheDocument();
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(3);
    items.forEach((item, index) => {
      expect(item).toHaveAttribute('aria-setsize', '3');
      expect(item).toHaveAttribute('aria-posinset', String(index + 1));
    });
  });

  it('renders each item as a group named by its id and content', () => {
    render(<LinkedEntityList items={makeItems([1, 2])} />);

    expect(screen.getByRole('group', { name: 'M-0001 Content 1' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'M-0002 Content 2' })).toBeInTheDocument();
  });

  it('renders the dismiss control as a native button with the dismiss label', async () => {
    const onDismiss = vi.fn();
    render(<LinkedEntityList items={makeItems([1, 2], onDismiss)} />);

    const button = screen.getByRole('button', { name: 'Unlink mitigation 2' });
    expect(button.tagName).toBe('BUTTON');
    await userEvent.click(button);
    expect(onDismiss).toHaveBeenCalledWith('id-2');
  });

  describe('focus after dismissing', () => {
    const Harness = ({ initial, onFocusFallback }: { initial: number[]; onFocusFallback?: () => void }) => {
      const [ids, setIds] = useState(initial);
      return (<LinkedEntityList
        items={makeItems(ids, id => setIds(current => current.filter(n => `id-${n}` !== id)))}
        onFocusFallback={onFocusFallback}
      />);
    };

    it('moves focus to the next item', async () => {
      render(<Harness initial={[1, 2, 3]} />);

      await userEvent.click(screen.getByRole('button', { name: 'Unlink mitigation 2' }));
      expect(screen.getByRole('link', { name: 'M-0003' })).toHaveFocus();
    });

    it('moves focus to the previous item when the last item is dismissed', async () => {
      render(<Harness initial={[1, 2, 3]} />);

      await userEvent.click(screen.getByRole('button', { name: 'Unlink mitigation 3' }));
      expect(screen.getByRole('link', { name: 'M-0002' })).toHaveFocus();
    });

    it('calls the fallback when the only item is dismissed', async () => {
      const onFocusFallback = vi.fn();
      render(<Harness initial={[1]} onFocusFallback={onFocusFallback} />);

      await userEvent.click(screen.getByRole('button', { name: 'Unlink mitigation 1' }));
      expect(onFocusFallback).toHaveBeenCalledTimes(1);
    });

    it('does not move focus until the item has been removed', async () => {
      const onFocusFallback = vi.fn();
      render(<LinkedEntityList items={makeItems([1, 2])} onFocusFallback={onFocusFallback} />);

      const button = screen.getByRole('button', { name: 'Unlink mitigation 1' });
      await userEvent.click(button);
      expect(button).toHaveFocus();
      expect(onFocusFallback).not.toHaveBeenCalled();
    });
  });
});

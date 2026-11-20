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
/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { FC, useEffect, useRef, useState } from 'react';
import LinkedEntityItem, { LinkedEntityItemProps } from '../LinkedEntityItem';

const styles = {
  list: css({
    listStyle: 'none',
    margin: 0,
    padding: 0,
  }),
};

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface LinkedEntityListItem extends Omit<LinkedEntityItemProps, 'setSize' | 'position'> {
  /** A stable key for the item. */
  id: string;
}

export interface LinkedEntityListProps {
  items: ReadonlyArray<LinkedEntityListItem>;
  /**
   * Called to move focus when the dismissed item was the only one left, because there is no
   * next or previous item to focus. Typically focuses the control that adds a link.
   */
  onFocusFallback?: () => void;
}

/**
 * A list of LinkedEntityItems. It keeps what the Cloudscape TokenGroup gave the previous version of
 * the linked entity lists: list semantics with the size and position of each item, and focus that moves
 * to the next item, then the previous item, then a fallback when an item is dismissed.
 */
const LinkedEntityList: FC<LinkedEntityListProps> = ({ items, onFocusFallback }) => {
  const listRef = useRef<HTMLUListElement>(null);
  // Set when an item is dismissed: where it was and how many items there were.
  const [pendingFocus, setPendingFocus] = useState<{ index: number; count: number } | null>(null);

  useEffect(() => {
    // Wait for the parent to remove the item before moving focus.
    if (!pendingFocus || items.length >= pendingFocus.count) {
      return;
    }
    const elements = Array.from(listRef.current?.children ?? []);
    // The next item has taken the dismissed item's index. If there is none, use the previous one.
    for (const element of [elements[pendingFocus.index], elements[pendingFocus.index - 1]]) {
      const target = element?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      if (target) {
        target.focus();
        setPendingFocus(null);
        return;
      }
    }
    onFocusFallback?.();
    setPendingFocus(null);
  }, [pendingFocus, items.length, onFocusFallback]);

  if (items.length === 0) {
    return null;
  }

  return (<ul css={styles.list} ref={listRef}>
    {items.map(({ id, onDismiss, ...item }, index) => (<LinkedEntityItem
      key={id}
      {...item}
      setSize={items.length}
      position={index + 1}
      onDismiss={() => {
        setPendingFocus({ index, count: items.length });
        onDismiss();
      }}
    />))}
  </ul>);
};

export default LinkedEntityList;

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
import CloudscapeHeader, { HeaderProps as CloudscapeHeaderProps } from '@cloudscape-design/components/header';
import { FC, isValidElement, createElement, PropsWithChildren, useMemo } from 'react';

export interface HeaderProps {
  actions?: CloudscapeHeaderProps['actions'];
  info?: CloudscapeHeaderProps['info'];
  variant?: CloudscapeHeaderProps['variant'];
  description?: CloudscapeHeaderProps['description'];
  allItemsLength?: number;
  selectedItemsLength?: number;
}

const CloudscapeHeaderType = createElement(CloudscapeHeader).type;

const Header: FC<PropsWithChildren<HeaderProps>> = ({
  selectedItemsLength,
  allItemsLength,
  children,
  actions,
  info,
  description,
  variant,
}) => {
  const customHeader = isValidElement(children) && children.type === CloudscapeHeaderType;

  const counter = useMemo(
    () =>
      allItemsLength
        ? selectedItemsLength
          ? `(${selectedItemsLength}/${allItemsLength})`
          : `(${allItemsLength})`
        : undefined,
    [allItemsLength, selectedItemsLength],
  );

  return customHeader ? (
    children
  ) : (
    <CloudscapeHeader counter={counter} info={info} actions={actions} description={description} variant={variant}>
      {children}
    </CloudscapeHeader>
  );
};

export default Header;

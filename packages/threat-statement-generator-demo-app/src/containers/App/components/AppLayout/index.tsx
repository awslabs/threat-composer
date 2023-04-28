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
import { SideNavigationProps } from '@cloudscape-design/components/side-navigation';
import { TopNavigationProps } from '@cloudscape-design/components/top-navigation';
import { FC, PropsWithChildren } from 'react';
import AppLayoutComponent from '../../../../components/AppLayout';

export interface ApplayoutProps {
  standalone?: boolean;
  navigationItems?: SideNavigationProps.Item[];
  headerProps?: Partial<TopNavigationProps>;
  availableRoutes?: string[];
}

const AppLayout: FC<PropsWithChildren<ApplayoutProps>> = ({
  standalone = true,
  children,
  navigationItems,
  ...rest
}) => {
  return (
    <AppLayoutComponent
      {...rest}
      title='#threat-composer'
      href='/'
      navigationItems={navigationItems || []}
      breadcrumbGroupHide={standalone}
      navigationHide={standalone} >
      {children}
    </AppLayoutComponent>
  );
};

export default AppLayout;

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

import ContentLayoutComponent from '@cloudscape-design/components/content-layout';
import Header, { HeaderProps } from '@cloudscape-design/components/header';
import { FC, PropsWithChildren } from 'react';
import { useApplicationInfoContext } from '../../../contexts/ApplicationContext';

export interface ContentLayoutProps extends HeaderProps {
  /**
   * The title of the header.
   */
  title?: string;
}

const ContentLayout: FC<PropsWithChildren<ContentLayoutProps>> = ({
  title,
  children,
  ...props
}) => {
  const { applicationInfo } = useApplicationInfoContext();

  return (<ContentLayoutComponent
    header={<Header
      variant="h1"
      {...props}
    >
      {applicationInfo.name ? `${title} for: ` + applicationInfo.name : 'Insights dashboard'}
    </Header>}
  >
    {children}
  </ContentLayoutComponent>);
};

export default ContentLayout;
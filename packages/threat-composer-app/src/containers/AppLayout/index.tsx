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
import {
  DEFAULT_WORKSPACE_ID,
} from '@aws/threat-composer';
import { SideNavigationProps } from '@cloudscape-design/components/side-navigation';
import { FC, PropsWithChildren, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import AppLayoutComponent from '../../components/FullAppLayout';
import {
  ROUTE_APPLICATION_INFO_PATH,
  ROUTE_ARCHITECTURE_INFO_PATH,
  ROUTE_ASSUMPTION_LIST_PATH,
  ROUTE_BRAINSTORM_PATH,
  ROUTE_DATAFLOW_INFO_PATH,
  ROUTE_THREAT_PACKS_PATH,
  ROUTE_MITIGATION_LIST_PATH,
  ROUTE_THREAT_LIST_PATH,
  ROUTE_VIEW_THREAT_MODEL_PATH,
  ROUTE_WORKSPACE_HOME_PATH,
  ROUTE_MITIGATION_PACKS_PATH,
} from '../../config/routes';
import useNotifications from '../../hooks/useNotifications';
import generateUrl from '../../utils/generateUrl';
import WorkspaceSelector from '../WorkspaceSelector';

const defaultHref = process.env.PUBLIC_URL || '/';

const AppLayout: FC<PropsWithChildren<{}>> = ({
  children,
}) => {
  const { workspaceId = DEFAULT_WORKSPACE_ID } = useParams();
  const notifications = useNotifications();
  const [searchParams] = useSearchParams();

  const navigationItems: SideNavigationProps.Item[] = useMemo(() => {
    const navItems: SideNavigationProps.Item[] = [
      {
        text: 'Dashboard',
        href: generateUrl(ROUTE_WORKSPACE_HOME_PATH, searchParams, workspaceId),
        type: 'link',
      },
      {
        text: 'Application info',
        href: generateUrl(ROUTE_APPLICATION_INFO_PATH, searchParams, workspaceId),
        type: 'link',
      },
      {
        text: 'Architecture',
        href: generateUrl(ROUTE_ARCHITECTURE_INFO_PATH, searchParams, workspaceId),
        type: 'link',
      },
      {
        text: 'Dataflow',
        href: generateUrl(ROUTE_DATAFLOW_INFO_PATH, searchParams, workspaceId),
        type: 'link',
      },
      {
        text: 'Brainstorm',
        href: generateUrl(ROUTE_BRAINSTORM_PATH, searchParams, workspaceId),
        type: 'link',
      },
      {
        text: 'Assumptions',
        href: generateUrl(ROUTE_ASSUMPTION_LIST_PATH, searchParams, workspaceId),
        type: 'link',
      },
      {
        text: 'Threats',
        href: generateUrl(ROUTE_THREAT_LIST_PATH, searchParams, workspaceId),
        type: 'link',
      },
      {
        text: 'Mitigations',
        href: generateUrl(ROUTE_MITIGATION_LIST_PATH, searchParams, workspaceId),
        type: 'link',
      },
      { type: 'divider' },
      {
        text: 'Threat model',
        href: generateUrl(ROUTE_VIEW_THREAT_MODEL_PATH, searchParams, workspaceId),
        type: 'link',
      },
      { type: 'divider' },
      {
        type: 'section',
        text: 'Reference packs',
        items: [
          {
            text: 'Threat packs',
            href: generateUrl(ROUTE_THREAT_PACKS_PATH, searchParams, workspaceId),
            type: 'link',
          },
          {
            text: 'Mitigation packs',
            href: generateUrl(ROUTE_MITIGATION_PACKS_PATH, searchParams, workspaceId),
            type: 'link',
          },
        ],
      },
    ];

    return navItems;
  }, [searchParams, workspaceId]);

  return (<AppLayoutComponent
    title='threat-composer'
    href={defaultHref}
    navigationItems={navigationItems}
    breadcrumbGroup={<WorkspaceSelector />}
    notifications={notifications}
    headerVariant='high-contrast'
  >
    {children}
  </AppLayoutComponent>);
};

export default AppLayout;

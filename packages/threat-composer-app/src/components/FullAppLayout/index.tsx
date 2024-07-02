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
import AppLayoutComponent, {
  AppLayoutProps as AppLayoutComponentProps,
} from '@cloudscape-design/components/app-layout';
import BreadcrumbGroup, { BreadcrumbGroupProps } from '@cloudscape-design/components/breadcrumb-group';
import { CancelableEventHandler } from '@cloudscape-design/components/internal/events';
import SideNavigation, { SideNavigationProps } from '@cloudscape-design/components/side-navigation';
import { TopNavigationProps } from '@cloudscape-design/components/top-navigation';
import { FC, ReactNode, useState, useCallback, createContext, PropsWithChildren, ReactElement, useContext, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { SEARCH_PARAM_MODE } from '../../config/searchParams';
import { NavHeaderProps } from '../NavHeader';

export type AppLayoutProps = (NavHeaderProps | { header: ReactElement<TopNavigationProps> })
& {
  headerProps?: Partial<TopNavigationProps>;
}
&
({
  navigationItems: SideNavigationProps.Item[];
}
| { navigation: ReactElement<SideNavigationProps> }
) & { breadcrumbGroup?: ReactNode } & {
  title: string;
  defaultBreadcrumb?: string;
} & { breadcrumbGroupHide?: boolean }
& { availableRoutes?: string[] }
& AppLayoutComponentProps;

export interface AppLayoutContextApi {
  setContentType: React.Dispatch<React.SetStateAction<AppLayoutComponentProps['contentType']>>;


  setNotifications: React.Dispatch<React.SetStateAction<AppLayoutComponentProps['notifications']>>;

  setNavigationOpen: React.Dispatch<React.SetStateAction<boolean>>;

  setTools: React.Dispatch<React.SetStateAction<AppLayoutComponentProps['tools']>>;
  setToolsHide: React.Dispatch<React.SetStateAction<boolean>>;
  setToolsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setToolsWidth: React.Dispatch<React.SetStateAction<AppLayoutComponentProps['toolsWidth']>>;

  setActiveBreadcrumbs: React.Dispatch<React.SetStateAction<BreadcrumbGroupProps.Item[]>>;
}

const initialState = {
  setContentType: () => { },

  setNotifications: () => { },

  setNavigationOpen: () => { },

  setTools: () => { },
  setToolsHide: () => { },
  setToolsOpen: () => { },
  setToolsWidth: () => { },

  setActiveBreadcrumbs: () => { },
};

export const AppLayoutContext = createContext<AppLayoutContextApi>(initialState);

/**
 * Provides the basic layout for all types of pages, including collapsible side navigation, tools panel, and split panel.
 */
const AppLayout: FC<PropsWithChildren<AppLayoutProps>> = ({
  title,
  defaultBreadcrumb = 'dashboard',
  children,
  headerProps,
  breadcrumbGroupHide,
  availableRoutes,
  ...props
}) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [contentType, setContentType] = useState(props.contentType);

  const [navigationOpen, setNavigationOpen] = useState(props.navigationOpen ?? true);
  const [notifications, setNotifications] = useState(props.notifications);
  const location = useLocation();

  const headerHref = useMemo(() => {
    const mode = searchParams.get(SEARCH_PARAM_MODE);
    const href = 'href' in props ? props.href : '/';
    return mode ? `${href}/?mode=${mode}` : href;
  }, [searchParams]);

  const [tools, setTools] = useState(props.tools);
  const [toolsHide, setToolsHide] = useState(props.toolsHide ?? true);
  const [toolsOpen, setToolsOpen] = useState(props.toolsOpen ?? false);
  const [toolsWidth, setToolsWidth] = useState(props.toolsWidth);

  const [activeHref, setActiveHref] = useState(headerHref);
  const [activeBreadcrumbs, setActiveBreadcrumbs] = useState<BreadcrumbGroupProps.Item[]>([
    { text: defaultBreadcrumb, href: headerHref },
  ]);

  useEffect(() => {
    setActiveHref(`${location.pathname}${location.search || ''}`);
  }, [location]);

  const onNavigate: CancelableEventHandler<BreadcrumbGroupProps.ClickDetail | SideNavigationProps.FollowDetail> =
    useCallback(
      (e) => {
        if (!e.detail.external) {
          e.preventDefault();
          e.stopPropagation();
          setContentType(undefined);
          navigate(e.detail.href);
        }
      },
      [navigate, setActiveBreadcrumbs, defaultBreadcrumb],
    );

  return (
    <AppLayoutContext.Provider
      value={{
        setContentType,

        setNotifications,

        setNavigationOpen,

        setTools,
        setToolsHide,
        setToolsOpen,
        setToolsWidth,

        setActiveBreadcrumbs,
      }}
    >
      {'header' in props ? (
        props.header
      ) : (
        undefined
      )}
      <AppLayoutComponent
        breadcrumbs={breadcrumbGroupHide ? undefined :
          ('breadcrumbGroup' in props ? (
            props.breadcrumbGroup
          ) : (
            <BreadcrumbGroup onFollow={onNavigate} items={activeBreadcrumbs} />
          ))
        }
        navigation={
          'navigation' in props ? (
            props.navigation
          ) : (
            <SideNavigation
              header={{ text: title, href: headerHref }}
              activeHref={activeHref}
              onFollow={onNavigate}
              items={props.navigationItems}
            />
          )
        }
        content={children}
        {...props}
        contentType={contentType}
        notifications={notifications}
        navigationOpen={navigationOpen}
        onNavigationChange={({ detail }) => setNavigationOpen(detail.open)}
        toolsHide={toolsHide}
        tools={tools}
        toolsOpen={toolsOpen}
        toolsWidth={toolsWidth}
        onToolsChange={({ detail }) => setToolsOpen(detail.open)}
      />
    </AppLayoutContext.Provider>
  );
};

export const useAppLayoutContext = () => useContext(AppLayoutContext);

export default AppLayout;

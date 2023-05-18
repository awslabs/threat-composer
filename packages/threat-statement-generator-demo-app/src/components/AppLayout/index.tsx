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
import Box from '@cloudscape-design/components/box';
import BreadcrumbGroup, { BreadcrumbGroupProps } from '@cloudscape-design/components/breadcrumb-group';
import { CancelableEventHandler } from '@cloudscape-design/components/internal/events';
import SideNavigation, { SideNavigationProps } from '@cloudscape-design/components/side-navigation';
import SplitPanel, { SplitPanelProps as SplitPanelComponentProps } from '@cloudscape-design/components/split-panel';
import { TopNavigationProps } from '@cloudscape-design/components/top-navigation';
import { FC, ReactNode, useState, useCallback, createContext, PropsWithChildren, ReactElement, useContext, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import NavHeader, { NavHeaderProps } from './components/NavHeader';
import { splitPanelI18nStrings } from './constants';

const defaultHref = process.env.PUBLIC_URL || '/';

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

export type SplitPanelProps = Pick<
SplitPanelComponentProps,
'header' | 'closeBehavior' | 'hidePreferencesButton' | 'children'
>;

export interface AppLayoutContextApi {
  setContentType: React.Dispatch<React.SetStateAction<AppLayoutComponentProps['contentType']>>;

  setSplitPanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setSplitPanelSize: React.Dispatch<React.SetStateAction<AppLayoutComponentProps['splitPanelSize']>>;
  setSplitPanelProps: React.Dispatch<React.SetStateAction<SplitPanelProps | undefined>>;
  setSplitPanelPreferences: React.Dispatch<React.SetStateAction<AppLayoutComponentProps.SplitPanelPreferences>>;

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

  setSplitPanelOpen: () => { },
  setSplitPanelSize: () => { },
  setSplitPanelProps: () => { },
  setSplitPanelPreferences: () => { },

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
  defaultBreadcrumb = 'home',
  children,
  headerProps,
  breadcrumbGroupHide,
  availableRoutes,
  ...props
}) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [contentType, setContentType] = useState(props.contentType);

  const [splitPanelOpen, setSplitPanelOpen] = useState(props.splitPanelOpen ?? false);
  const [splitPanelSize, setSplitPanelSize] = useState(props.splitPanelSize);
  const [splitPanelProps, setSplitPanelProps] = useState<SplitPanelProps | undefined>();
  const [splitPanelPreferences, setSplitPanelPreferences] = useState(
    props.splitPanelPreferences ?? ({ position: 'bottom' } as AppLayoutComponentProps.SplitPanelPreferences),
  );

  const [navigationOpen, setNavigationOpen] = useState(props.navigationOpen ?? true);

  const [notifications, setNotifications] = useState(props.notifications);

  const headerHref = useMemo(() => {
    const mode = searchParams.get('mode');
    return mode ? `${defaultHref}/?mode=${mode}` : defaultHref;
  }, [searchParams]);

  const [tools, setTools] = useState(props.tools);
  const [toolsHide, setToolsHide] = useState(props.toolsHide ?? true);
  const [toolsOpen, setToolsOpen] = useState(props.toolsOpen ?? false);
  const [toolsWidth, setToolsWidth] = useState(props.toolsWidth);

  const [activeHref, setActiveHref] = useState(headerHref);
  const [activeBreadcrumbs, setActiveBreadcrumbs] = useState<BreadcrumbGroupProps.Item[]>([
    { text: defaultBreadcrumb, href: headerHref },
  ]);

  const onNavigate: CancelableEventHandler<BreadcrumbGroupProps.ClickDetail | SideNavigationProps.FollowDetail> =
    useCallback(
      (e) => {
        if (!e.detail.external) {
          e.preventDefault();
          setContentType(undefined);

          setSplitPanelOpen(false);
          setSplitPanelSize(undefined);
          setSplitPanelProps(undefined);

          setActiveHref(e.detail.href);
          navigate(e.detail.href);
        }
      },
      [navigate, setActiveBreadcrumbs, defaultBreadcrumb],
    );

  const splitPanel = useMemo(() => {
    return splitPanelProps ? (
      <SplitPanel i18nStrings={splitPanelI18nStrings} {...splitPanelProps}>
        {splitPanelProps?.children}
      </SplitPanel>
    ) : null;
  }, [splitPanelProps]);

  return (
    <AppLayoutContext.Provider
      value={{
        setContentType,

        setSplitPanelOpen,
        setSplitPanelSize,
        setSplitPanelProps,
        setSplitPanelPreferences,

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
        props.navigationHide ? <NavHeader
          title={title}
          href={headerHref}
          logo={props.logo}
          {...headerProps}
        /> : undefined
      )}
      <AppLayoutComponent
        breadcrumbs={ breadcrumbGroupHide ? undefined :
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
        content={
          !contentType || contentType === 'default' ? <Box padding={{ top: 'l' }}>{children}</Box> : children
        }
        {...props}
        contentType={contentType}
        splitPanelOpen={splitPanelOpen}
        splitPanelSize={splitPanelSize}
        splitPanel={splitPanel}
        splitPanelPreferences={splitPanelPreferences}
        onSplitPanelToggle={({ detail }) => setSplitPanelOpen(detail.open)}
        onSplitPanelResize={({ detail }) => setSplitPanelSize(detail.size)}
        onSplitPanelPreferencesChange={({ detail }) => setSplitPanelPreferences(detail)}
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

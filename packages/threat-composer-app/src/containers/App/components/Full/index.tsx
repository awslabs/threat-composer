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
import { FC, useMemo, useCallback, useState } from 'react';
import { Routes, Route, RouteProps, useParams, useSearchParams, useNavigate, Navigate } from 'react-router-dom';
import { ContextAggregator, DataExchangeFormat, WorkspaceSelector, useWorkspacesContext } from 'threat-composer';
import AppLayout from '../../../../components/FullAppLayout';
import { ROUTE_APPLICATION_INFO, ROUTE_ARCHITECTURE_INFO, ROUTE_ASSUMPTION_LIST, ROUTE_DATAFLOW_INFO, ROUTE_MITIGATION_LIST, ROUTE_THREAT_EDITOR, ROUTE_THREAT_LIST, ROUTE_VIEW_THREAT_MODEL } from '../../../../config/routes';
import routes from '../../../../routes';
import generateUrl from '../../../../utils/generateUrl';
import ThreatModelReport from '../../../ThreatModelReport';

const TEMP_PREVIEW_DATA_KEY = 'ThreatStatementGenerator.TempPreviewData';

const defaultHref = process.env.PUBLIC_URL || '/';

const AppInner = () => {
  const [searchParms] = useSearchParams();
  const { currentWorkspace } = useWorkspacesContext();
  return (<Routes>
    {routes.map((r: RouteProps, index: number) => <Route key={index} {...r} />)}
    <Route path='*' element={<Navigate to={generateUrl(ROUTE_VIEW_THREAT_MODEL, searchParms, currentWorkspace ? currentWorkspace.id : 'default')} />} />
  </Routes>);
};

const Full: FC = () => {
  const { workspaceId: initialWorkspaceId } = useParams();
  const [searchParms] = useSearchParams();
  const navigate = useNavigate();
  const [isPreview] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const previewParams = urlParams.get('preview');
    return previewParams === 'true';
  });

  const [workspaceId, setWorkspaceId] = useState(initialWorkspaceId || 'default');

  const handleWorkspaceChanged = useCallback((newWorkspaceId: string) => {
    if (newWorkspaceId !== workspaceId) {
      setWorkspaceId(newWorkspaceId);
      navigate(generateUrl(ROUTE_THREAT_LIST, searchParms, newWorkspaceId));
    }
  }, [navigate, workspaceId, searchParms]);

  const handleThreatListView = useCallback(() => {
    navigate(generateUrl(ROUTE_THREAT_LIST, searchParms, workspaceId));
  }, [navigate, workspaceId, searchParms]);

  const handleThreatEditorView = useCallback((newThreatId?: string) => {
    navigate(generateUrl(ROUTE_THREAT_EDITOR, searchParms, workspaceId, newThreatId));
  }, [navigate, workspaceId, searchParms]);

  const navigationItems: SideNavigationProps.Item[] = useMemo(() => {
    return [
      {
        text: 'Application Info',
        href: generateUrl(ROUTE_APPLICATION_INFO, searchParms, workspaceId),
        type: 'link',
      },
      {
        text: 'Architecture',
        href: generateUrl(ROUTE_ARCHITECTURE_INFO, searchParms, workspaceId),
        type: 'link',
      },
      {
        text: 'Dataflow',
        href: generateUrl(ROUTE_DATAFLOW_INFO, searchParms, workspaceId),
        type: 'link',
      },
      {
        text: 'Assumptions',
        href: generateUrl(ROUTE_ASSUMPTION_LIST, searchParms, workspaceId),
        type: 'link',
      },
      {
        text: 'Threats',
        href: generateUrl(ROUTE_THREAT_LIST, searchParms, workspaceId),
        type: 'link',
      },
      {
        text: 'Mitigations',
        href: generateUrl(ROUTE_MITIGATION_LIST, searchParms, workspaceId),
        type: 'link',
      },
      { type: 'divider' },
      {
        text: 'Threat model',
        href: generateUrl(ROUTE_VIEW_THREAT_MODEL, searchParms, workspaceId),
        type: 'link',
      },
    ];
  }, [searchParms, workspaceId]);

  const handlePreview = useCallback((data: DataExchangeFormat) => {
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.set('preview', 'true');
    window.localStorage.setItem(TEMP_PREVIEW_DATA_KEY, JSON.stringify(data));
    urlParams.set('dataKey', TEMP_PREVIEW_DATA_KEY);
    window.open(`${window.location.pathname}?${urlParams.toString()}`, '_blank', 'noopener,noreferrer,resizable');
  }, []);

  const handleImported = useCallback(() => {
    navigate(generateUrl(ROUTE_VIEW_THREAT_MODEL, searchParms, workspaceId));
  }, [navigate, workspaceId, searchParms]);

  return (
    <ContextAggregator
      composerMode='Full'
      onWorkspaceChanged={handleWorkspaceChanged}
      onThreatListView={handleThreatListView}
      onThreatEditorView={handleThreatEditorView}
      onPreview={handlePreview}
      onImported={handleImported}
    >
      {isPreview ? (
        <ThreatModelReport />
      ) : (<AppLayout
        title='threat-composer'
        href={defaultHref}
        navigationItems={navigationItems}
        availableRoutes={routes.map(x => x.path || '')}
        breadcrumbGroup={<WorkspaceSelector embededMode={false} />}
      >
        <AppInner />
      </AppLayout>)}
    </ContextAggregator>
  );
};

export default Full;

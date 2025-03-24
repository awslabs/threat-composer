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
import React from 'react';
import { createBrowserRouter, createMemoryRouter, redirect } from 'react-router-dom';
import initialWorkspaceLoader from './initialWorkspaceLoader';
import {
  ROUTE_WORKSPACE_HOME_PATH,
  ROUTE_APPLICATION_INFO_PATH,
  ROUTE_ARCHITECTURE_INFO_PATH,
  ROUTE_ASSUMPTION_LIST_PATH,
  ROUTE_DATAFLOW_INFO_PATH,
  ROUTE_MITIGATION_LIST_PATH,
  ROUTE_THREAT_EDITOR_PATH,
  ROUTE_THREAT_LIST_PATH,
  ROUTE_VIEW_THREAT_MODEL_PATH,
  ROUTE_THREAT_PACK_PATH,
  ROUTE_THREAT_PACKS_PATH,
  ROUTE_MITIGATION_PACK_PATH,
  ROUTE_MITIGATION_PACKS_PATH,
  ROUTE_WORKSPACE_PATH,
  ROUTE_PREVIEW_PATH,
} from '../config/routes';
import isMemoryRouterUsed from '../utils/isMemoryRouterUsed';

const ROUTE_BASE_PATH = process.env.REACT_APP_ROUTE_BASE_PATH;

const AppRoot = React.lazy(() => import('../containers/AppRoot'));
const WorkspaceRoot = React.lazy(() => import('../containers/WorkspaceRoot'));
const Architecture = React.lazy(() => import('../containers/Architecture'));
const Application = React.lazy(() => import('../containers/Application'));
const Dataflow = React.lazy(() => import('../containers/Dataflow'));
const AssumptionList = React.lazy(() => import('../containers/AssumptionList'));
const MitigationList = React.lazy(() => import('../containers/MitigationList'));
const MitigationPack = React.lazy(() => import('../containers/MitigationPack'));
const MitigationPacks = React.lazy(() => import('../containers/MitigationPacks'));
const ThreatModelPreview = React.lazy(() => import('../containers/ThreatModelPreview'));
const ThreatModelReport = React.lazy(() => import('../containers/ThreatModelReport'));
const ThreatPack = React.lazy(() => import('../containers/ThreatPack'));
const ThreatPacks = React.lazy(() => import('../containers/ThreatPacks'));
const ThreatStatementEditor = React.lazy(() => import('../containers/ThreatStatementEditor'));
const ThreatStatementList = React.lazy(() => import('../containers/ThreatStatementList'));
const WorkspaceHome = React.lazy(() => import('../containers/WorkspaceHome'));

const workspaceRoutes = [
  {
    index: true,
    loader: async () => redirect(ROUTE_WORKSPACE_HOME_PATH),
  },
  {
    path: ROUTE_WORKSPACE_HOME_PATH,
    element: <WorkspaceHome />,
  },
  {
    path: ROUTE_APPLICATION_INFO_PATH,
    element: <Application />,
  },
  {
    path: ROUTE_ARCHITECTURE_INFO_PATH,
    element: <Architecture />,
  },
  {
    path: ROUTE_ASSUMPTION_LIST_PATH,
    element: <AssumptionList />,
  },
  {
    path: ROUTE_DATAFLOW_INFO_PATH,
    element: <Dataflow />,
  },
  {
    path: ROUTE_MITIGATION_LIST_PATH,
    element: <MitigationList />,
  },
  {
    path: ROUTE_VIEW_THREAT_MODEL_PATH,
    element: <ThreatModelReport />,
  },
  {
    path: ROUTE_THREAT_PACK_PATH,
    element: <ThreatPack />,
  },
  {
    path: ROUTE_THREAT_PACKS_PATH,
    element: <ThreatPacks />,
  },
  {
    path: ROUTE_MITIGATION_PACK_PATH,
    element: <MitigationPack />,
  },
  {
    path: ROUTE_MITIGATION_PACKS_PATH,
    element: <MitigationPacks />,
  },
  {
    path: ROUTE_THREAT_EDITOR_PATH,
    element: <ThreatStatementEditor />,
  },
  {
    path: ROUTE_THREAT_LIST_PATH,
    element: <ThreatStatementList />,
  },
];

export const createRouter = isMemoryRouterUsed() ? createMemoryRouter : createBrowserRouter;

export const routerOpts = ROUTE_BASE_PATH ? {
  basename: ROUTE_BASE_PATH,
} : {};

export const routes = [
  {
    index: true,
    loader: initialWorkspaceLoader,
  },
  {
    path: '/',
    element: <AppRoot />,
    children: [
      {
        path: ROUTE_WORKSPACE_PATH,
        element: <WorkspaceRoot />,
        children: [
          ...workspaceRoutes,
        ],
      },
      {
        path: ROUTE_PREVIEW_PATH,
        element: <ThreatModelPreview />,
      },
    ],
  },
];

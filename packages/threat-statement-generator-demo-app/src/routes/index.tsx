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
import { RouteProps } from 'react-router-dom';
import { ROUTE_APPLICATION_INFO, ROUTE_ARCHITECTURE_INFO, ROUTE_ASSUMPTION_LIST, ROUTE_DATAFLOW_INFO, ROUTE_MITIGATION_LIST, ROUTE_THREAT_EDITOR, ROUTE_THREAT_LIST, ROUTE_VIEW_THREAT_MODEL } from '../config/routes';
import Application from '../containers/Application';
import Architecture from '../containers/Architecture';
import AssumptionList from '../containers/AssumptionList';
import Dataflow from '../containers/Dataflow';
import MitigationList from '../containers/MitigationList';
import ThreatModelReport from '../containers/ThreatModelReport';
import ThreatStatementEditor from '../containers/ThreatStatementEditor';
import ThreatStatementList from '../containers/ThreatStatementList';

const routes: RouteProps[] = [
  {
    path: ROUTE_APPLICATION_INFO,
    element: <Application />,
  },
  {
    path: ROUTE_ARCHITECTURE_INFO,
    element: <Architecture />,
  },
  {
    path: ROUTE_ASSUMPTION_LIST,
    element: <AssumptionList />,
  },
  {
    path: ROUTE_DATAFLOW_INFO,
    element: <Dataflow />,
  },
  {
    path: ROUTE_MITIGATION_LIST,
    element: <MitigationList />,
  },
  {
    path: ROUTE_VIEW_THREAT_MODEL,
    element: <ThreatModelReport />,
  },
  {
    path: ROUTE_THREAT_EDITOR,
    element: <ThreatStatementEditor />,
  },
  {
    path: ROUTE_THREAT_LIST,
    element: <ThreatStatementList />,
  },
];

export default routes;
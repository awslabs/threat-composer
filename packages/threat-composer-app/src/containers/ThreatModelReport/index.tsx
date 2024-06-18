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
import { ThreatModel } from '@aws/threat-composer';
import { FC } from 'react';
import {
  ROUTE_APPLICATION_INFO,
  ROUTE_ARCHITECTURE_INFO,
  ROUTE_ASSUMPTION_LIST,
  ROUTE_DATAFLOW_INFO,
  ROUTE_MITIGATION_LIST,
  ROUTE_THREAT_LIST,
} from '../../config/routes';
import useNavigateView from '../../hooks/useNavigationView';
import useOnPreview from '../../hooks/useOnPreview';
import convertToDocx from '../../utils/convertToDocx';

const ThreatModelReport: FC = () => {
  const handleNavigationView = useNavigateView();
  const [onPreview] = useOnPreview();

  return (<ThreatModel
    convertToDocx={convertToDocx}
    onPrintButtonClick={onPreview}
    onApplicationInfoView={() => handleNavigationView(ROUTE_APPLICATION_INFO)}
    onArchitectureView={() => handleNavigationView(ROUTE_ARCHITECTURE_INFO)}
    onDataflowView={() => handleNavigationView(ROUTE_DATAFLOW_INFO)}
    onAssumptionListView={() => handleNavigationView(ROUTE_ASSUMPTION_LIST)}
    onMitigationListView={() => handleNavigationView(ROUTE_MITIGATION_LIST)}
    onThreatListView={() => handleNavigationView(ROUTE_THREAT_LIST)}
  />);
};

export default ThreatModelReport;
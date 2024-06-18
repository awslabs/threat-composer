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
import { ThreatStatementList as ThreatStatementListComponent } from '@aws/threat-composer';
import { useLocation } from 'react-router-dom';
import { ROUTE_THREAT_EDITOR } from '../../config/routes';
import useNavigateView from '../../hooks/useNavigationView';

const ThreatStatementList = () => {
  const handleNavigateView = useNavigateView();
  const { state } = useLocation();
  return <ThreatStatementListComponent
    initialFilter={state?.filter}
    onThreatEditorView={(threatId: string, idToCopy?: string) => handleNavigateView(ROUTE_THREAT_EDITOR, threatId, undefined, idToCopy ? {
      idToCopy,
    } : undefined, {
      state: {
        idToCopy,
      },
    })}
  />;
};

export default ThreatStatementList;
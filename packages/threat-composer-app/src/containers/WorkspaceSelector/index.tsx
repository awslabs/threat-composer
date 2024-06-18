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
  WorkspaceSelector as WorkspaceSelectorComponent,
  APP_MODE_BROWSER_EXTENSION,
  APP_MODE_IDE_EXTENSION,
} from '@aws/threat-composer';
import { appMode } from '../../config/appMode';
import { ROUTE_VIEW_THREAT_MODEL } from '../../config/routes';
import useNavigateView from '../../hooks/useNavigationView';
import useOnPreview from '../../hooks/useOnPreview';


const WorkspaceSelector = () => {
  const [onPreview] = useOnPreview();
  const navigate = useNavigateView();

  return <WorkspaceSelectorComponent
    onPreview={onPreview}
    onImported={() => navigate(ROUTE_VIEW_THREAT_MODEL)}
    singletonMode={appMode === APP_MODE_BROWSER_EXTENSION || appMode === APP_MODE_IDE_EXTENSION}
    singletonPrimaryActionButtonConfig={appMode === APP_MODE_IDE_EXTENSION ? {
      text: 'Save',
      eventName: 'save',
    } : undefined}
    embededMode={false}
  />;
};

export default WorkspaceSelector;
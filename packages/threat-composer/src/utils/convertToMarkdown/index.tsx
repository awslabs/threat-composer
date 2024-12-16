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

import { i18n } from 'i18next';
import { getApplicationInfoContent } from './utils/getApplicationInfo';
import { getApplicationName } from './utils/getApplicationName';
import { getArchitectureContent } from './utils/getArchitecture';
import { getAssetsContent } from './utils/getAssets';
import { getAssumptionsContent } from './utils/getAssumptions';
import { getDataflowContent } from './utils/getDataFlow';
import { getMitigationsContent } from './utils/getMitigations';
import { getThreatsContent } from './utils/getThreats';
import { DataExchangeFormat } from '../../customTypes';
import hasContent from '../hasContent';
import sanitizeHtml from '../sanitizeHtml';

const convertToMarkdown = async (data: DataExchangeFormat, composerMode = 'Full', t: i18n['t'], defaultDir: string) => {
  const sanitizedData = sanitizeHtml(data);
  const [_, hasContentDetails] = hasContent(data);

  const processedContent = (composerMode === 'Full' ? [
    (!hasContentDetails || hasContentDetails.applicationName) && await getApplicationName(sanitizedData),
    (!hasContentDetails || hasContentDetails.applicationInfo) && await getApplicationInfoContent(sanitizedData, t),
    (!hasContentDetails || hasContentDetails.architecture) && await getArchitectureContent(sanitizedData, t),
    (!hasContentDetails || hasContentDetails.dataflow) && await getDataflowContent(sanitizedData, t),
    (!hasContentDetails || hasContentDetails.assumptions) && await getAssumptionsContent(sanitizedData, t, defaultDir),
    (!hasContentDetails || hasContentDetails.threats) && await getThreatsContent(sanitizedData, t, defaultDir),
    (!hasContentDetails || hasContentDetails.mitigations) && await getMitigationsContent(sanitizedData, t, defaultDir),
    (!hasContentDetails || hasContentDetails.threats) && await getAssetsContent(sanitizedData, t, defaultDir),
  ] : [await getThreatsContent(sanitizedData, t, defaultDir, true)]).filter(x => !!x).join('\n');

  return processedContent;
};

export default convertToMarkdown;
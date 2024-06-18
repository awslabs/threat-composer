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
import { DataExchangeFormat } from '@aws/threat-composer';
import { useCallback } from 'react';
import { generatePath } from 'react-router-dom';
import { ROUTE_PREVIEW } from '../../config/routes';

const TEMP_PREVIEW_DATA_KEY = 'ThreatStatementGenerator.TempPreviewData';
const ROUTE_BASE_PATH = process.env.REACT_APP_ROUTE_BASE_PATH;

const useOnPreview = () => {
  const handlePreview = useCallback((data: DataExchangeFormat) => {
    window.localStorage.setItem(TEMP_PREVIEW_DATA_KEY, JSON.stringify(data));
    const url = `${ROUTE_BASE_PATH || ''}${generatePath(ROUTE_PREVIEW, {
      dataKey: TEMP_PREVIEW_DATA_KEY,
    })}`;

    window.open(url, '_blank', 'noopener,noreferrer,resizable');
  }, []);

  return [handlePreview] as [(data: DataExchangeFormat) => void];
};

export default useOnPreview;
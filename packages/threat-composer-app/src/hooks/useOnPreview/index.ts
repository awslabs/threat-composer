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
import { useCallback, useRef } from 'react';
import { generatePath } from 'react-router-dom';
import { ROUTE_PREVIEW } from '../../config/routes';

const TEMP_PREVIEW_DATA_KEY = 'ThreatStatementGenerator.TempPreviewData';

const useOnPreview = () => {
  const winRef = useRef<Window>();

  const handlePreview = useCallback((data: DataExchangeFormat) => {
    window.localStorage.setItem(TEMP_PREVIEW_DATA_KEY, JSON.stringify(data));
    const win = window.open(generatePath(ROUTE_PREVIEW, {
      dataKey: TEMP_PREVIEW_DATA_KEY,
    }), '_blank', 'noopener,noreferrer,resizable');
    if (win) {
      winRef.current = win;
      win.onbeforeunload = () => {
        winRef.current = undefined;
        window.localStorage.removeItem(TEMP_PREVIEW_DATA_KEY);
      };
    }
  }, []);

  const handlePreviewClose = useCallback(() => {
    if (winRef.current) {
      winRef.current.close();
    }
  }, []);

  return [handlePreview, handlePreviewClose] as [(data: DataExchangeFormat) => void, () => void];
};

export default useOnPreview;
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
import { FC, useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ThreatModel, ThreatModelView } from 'threat-composer';

const ThreatModelReport: FC = () => {
  const [searchParms] = useSearchParams();
  const [isPreview] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const previewParams = urlParams.get('preview');
    return previewParams === 'true';
  });

  const [data] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const dataKey = urlParams.get('dataKey');
    const dataStr = dataKey && window.localStorage.getItem(dataKey);

    if (dataStr) {
      return JSON.parse(dataStr);
    }

    if (dataKey) {
      return {};
    }

    return undefined;
  });

  const handlePrintButtonClick = useCallback(() => {
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.set('preview', 'true');
    window.open(`${window.location.pathname}?${urlParams.toString()}`, '_blank', 'noopener,noreferrer,resizable');
  }, []);

  return (data
    ? (<ThreatModelView composerMode={searchParms.get('mode') || ''} data={data} onPrintButtonClick={isPreview ? undefined : handlePrintButtonClick} />)
    : (<ThreatModel
      onPrintButtonClick={isPreview ? undefined : handlePrintButtonClick}
    />));
};

export default ThreatModelReport;
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
import { ThreatModelView } from '@aws/threat-composer';
import Box from '@cloudscape-design/components/box';
import { FC, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';

const ThreatModelPreview: FC = () => {
  const { dataKey } = useParams();

  const data = useMemo(() => {
    const dataStr = dataKey && window.localStorage.getItem(dataKey);

    if (dataStr) {
      return JSON.parse(dataStr);
    }

    return undefined;
  }, []);

  useEffect(() => {
    return () => {
      dataKey && window.localStorage.removeItem(dataKey);
    };
  }, [dataKey]);

  if (!data) {
    return <Box>No content</Box>;
  }

  return <ThreatModelView composerMode='Full' data={data} isPreview />;
};

export default ThreatModelPreview;
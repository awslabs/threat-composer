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
import Box from '@cloudscape-design/components/box';
import ColumnLayout from '@cloudscape-design/components/column-layout';
import { useMemo } from 'react';
import { useMitigationLinksContext } from '../../../../../contexts/MitigationLinksContext';
import { useThreatsContext } from '../../../../../contexts/ThreatsContext';

const Overview = () => {
  const { statementList } = useThreatsContext();
  const { mitigationLinkList } = useMitigationLinksContext();

  const missingMitigation = useMemo(() => {
    return statementList.filter(s => mitigationLinkList.find(ml => ml.linkedId === s.id)).length;
  }, [statementList, mitigationLinkList]);

  return <ColumnLayout columns={4} variant="text-grid">
    <div>
      <Box variant='awsui-key-label'>Total</Box>
      <Box variant='awsui-value-large'>{statementList.length}</Box>
    </div>
    <div>
      <Box variant='awsui-key-label'>Missing mitigations</Box>
      <Box variant='awsui-value-large'>{missingMitigation}</Box>
    </div>
  </ColumnLayout>;
};

export default Overview;
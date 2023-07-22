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
import { SpaceBetween } from '@cloudscape-design/components';
import Badge from '@cloudscape-design/components/badge';
import Box from '@cloudscape-design/components/box';
import ColumnLayout from '@cloudscape-design/components/column-layout';
import Icon from '@cloudscape-design/components/icon';
import Link from '@cloudscape-design/components/link';
import { useMemo, FC } from 'react';
import { useMitigationLinksContext } from '../../../../../contexts/MitigationLinksContext';
import { useThreatsContext } from '../../../../../contexts/ThreatsContext';
import filterThreatsByMetadata from '../../../../../utils/filterThreatsByMetadata';

const NumberWithWarningSign: FC<{
  displayedNumber: number;
}> = ({ displayedNumber }) => {
  return displayedNumber > 0 ? (
    <SpaceBetween direction="horizontal" size="xxs">
      <Link variant="awsui-value-large" href="#ThreatList">
        {displayedNumber}
      </Link>
      <Icon name="status-warning" variant="warning" />
    </SpaceBetween>
  ) : (
    <Link variant="awsui-value-large" href="#ThreatList">
      {displayedNumber}
    </Link>
  );
};

const Overview: FC = () => {
  const { statementList } = useThreatsContext();
  const { mitigationLinkList } = useMitigationLinksContext();

  const missingMitigation = useMemo(() => {
    return statementList.filter((s) =>
      !mitigationLinkList.find((ml) => ml.linkedId === s.id),
    ).length;
  }, [statementList, mitigationLinkList]);

  const missingPriority = useMemo(() => {
    return filterThreatsByMetadata(statementList, 'Priority').length;
  }, [statementList]);

  const countHigh = useMemo(() => {
    return filterThreatsByMetadata(statementList, 'Priority', 'High').length;
  }, [statementList]);

  const countMed = useMemo(() => {
    return filterThreatsByMetadata(statementList, 'Priority', 'Medium').length;
  }, [statementList]);

  const countLow = useMemo(() => {
    return filterThreatsByMetadata(statementList, 'Priority', 'Low').length;
  }, [statementList]);

  return (
    <ColumnLayout columns={6} variant="text-grid" minColumnWidth={170}>
      <div>
        <Box variant="awsui-key-label">Total</Box>
        <Link variant="awsui-value-large" href="#ThreatList">
          {statementList.length}
        </Link>
      </div>
      <div>
        <Box variant="awsui-key-label">Missing mitigations</Box>
        <NumberWithWarningSign displayedNumber={missingMitigation} />
      </div>
      <div>
        <Box variant="awsui-key-label">
          <Badge color="red">High</Badge>
        </Box>
        <Link variant="awsui-value-large" href="#ThreatList">{countHigh}</Link>
      </div>
      <div>
        <Box variant="awsui-key-label">
          <Badge color="blue">Med</Badge>
        </Box>
        <Link variant="awsui-value-large" href="#ThreatList">{countMed}</Link>
      </div>
      <div>
        <Box variant="awsui-key-label">
          <Badge color="green">Low</Badge>
        </Box>
        <Link variant="awsui-value-large" href="#ThreatList">{countLow}</Link>
      </div>
      <div>
        <Box variant="awsui-key-label">Missing priority</Box>
        <NumberWithWarningSign displayedNumber={missingPriority} />
      </div>
    </ColumnLayout>
  );
};

export default Overview;

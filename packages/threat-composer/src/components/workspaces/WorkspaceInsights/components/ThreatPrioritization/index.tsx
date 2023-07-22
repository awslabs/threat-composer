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
  Button,
  Box,
  SpaceBetween,
  ColumnLayout,
  Link,
  Icon,
} from '@cloudscape-design/components';
import BarChart from '@cloudscape-design/components/bar-chart';
import { colorChartsGreen600, colorChartsPurple600, colorChartsYellow600 } from '@cloudscape-design/design-tokens';
import { useMemo } from 'react';

import { useThreatsContext } from '../../../../../contexts/ThreatsContext';
import filterThreatsByMetadata from '../../../../../utils/filterThreatsByMetadata';

const ThreatPrioritization = () => {
  const { statementList } = useThreatsContext();

  const missingPriority = useMemo(() => filterThreatsByMetadata(statementList, 'Priority').length, [statementList]);

  const countHigh = useMemo(() => filterThreatsByMetadata(statementList, 'Priority', 'High').length, [statementList]);
  const countMed = useMemo(() => filterThreatsByMetadata(statementList, 'Priority', 'Medium').length, [statementList]);
  const countLow = useMemo(() => filterThreatsByMetadata(statementList, 'Priority', 'Low').length, [statementList]);

  return (
    <ColumnLayout columns={1} borders="horizontal">
      <BarChart
        series={[
          {
            title: 'High',
            type: 'bar',
            data: [{ x: 'High', y: countHigh }],
            color: colorChartsYellow600,
          },
          {
            title: 'Med',
            type: 'bar',
            data: [{ x: 'Med', y: countMed }],
            color: colorChartsGreen600,
          },
          {
            title: 'Low',
            type: 'bar',
            data: [{ x: 'Low', y: countLow }],
            color: colorChartsPurple600,
          },
        ]}
        ariaLabel="Threat Prioritization Chart"
        emphasizeBaselineAxis={false}
        height={245}
        hideFilter
        horizontalBars
        stackedBars
        empty={
          <Box textAlign="center" color="inherit">
            <b>No data available</b>
            <Box variant="p" color="inherit">
              There is no data available
            </Box>
          </Box>
        }
        noMatch={
          <Box textAlign="center" color="inherit">
            <b>No matching data</b>
            <Box variant="p" color="inherit">
              There is no matching data to display
            </Box>
            <Button>Clear filter</Button>
          </Box>
        }
      />
      {missingPriority > 0 ? (
        <div>
          <Box variant="awsui-key-label">Missing priority</Box>
          <SpaceBetween direction="horizontal" size="xxs">
            <Link variant="awsui-value-large" href="#ThreatList">
              {missingPriority}
            </Link>
            <Icon name="status-warning" variant="warning" />
          </SpaceBetween>
        </div>
      ) : (
        <div></div>
      )}
    </ColumnLayout>
  );
};
export default ThreatPrioritization;

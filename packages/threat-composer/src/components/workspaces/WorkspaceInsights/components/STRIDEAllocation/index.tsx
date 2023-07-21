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
  FormField,
  Select,
  ColumnLayout,
  Link,
  Icon,
} from '@cloudscape-design/components';
import BarChart from '@cloudscape-design/components/bar-chart';
import { useThreatsContext } from '../../../../../contexts/ThreatsContext';

const STRIDEAllocation = () => {
  const { statementList } = useThreatsContext();
  const missingStride = statementList.length - statementList.filter((s) => s.metadata?.find(m => m.key === 'STRIDE' && m.value.length)).length;
  const countSpoofing = statementList.filter((s) => s.metadata?.find(m => m.key === 'STRIDE' && m.value.includes('S'))).length;
  const countTampering = statementList.filter((s) => s.metadata?.find(m => m.key === 'STRIDE' && m.value.includes('T'))).length;
  const countRepudiation = statementList.filter((s) => s.metadata?.find(m => m.key === 'STRIDE' && m.value.includes('R'))).length;
  const countInformationDisclosure = statementList.filter((s) => s.metadata?.find(m => m.key === 'STRIDE' && m.value.includes('I'))).length;
  const countDenialOfService = statementList.filter((s) => s.metadata?.find(m => m.key === 'STRIDE' && m.value.includes('D'))).length;
  const countElevationOfPrivilege = statementList.filter((s) => s.metadata?.find(m => m.key === 'STRIDE' && m.value.includes('E'))).length;

  return (
    <ColumnLayout columns={1} borders="horizontal">
      <div>
        <FormField label="Filter by threat priority">
          <Select
            selectedOption={{ label: 'All' }}
            placeholder="Filter data"
            empty="Not supported in the demo"
            onChange={() => {
              /*noop*/
            }}
            options={[
              { label: 'High', value: '1' },
              { label: 'Med', value: '2' },
              { label: 'Low', value: '3' },
              { label: 'All', value: '5' },
            ]}
          />
        </FormField>
      </div>
      <BarChart
        series={[
          {
            title: 'Spoofing',
            type: 'bar',
            data: [{ x: 'Spoofing', y: countSpoofing }],
          },
          {
            title: 'Tampering',
            type: 'bar',
            data: [{ x: 'Tampering', y: countTampering }],
          },
          {
            title: 'Repudiation',
            type: 'bar',
            data: [{ x: 'Repudiation', y: countRepudiation }],
          },
          {
            title: 'Information disclosure',
            type: 'bar',
            data: [{ x: 'Information disclosure', y: countInformationDisclosure }],
          },
          {
            title: 'Denial of service',
            type: 'bar',
            data: [{ x: 'Denial of Service', y: countDenialOfService }],
          },
          {
            title: 'Elevation of Privilege',
            type: 'bar',
            data: [{ x: 'Elevation of Privilege', y: countElevationOfPrivilege }],
          },
        ]}
        ariaLabel="Stacked, horizontal bar chart"
        emphasizeBaselineAxis={false}
        height={280}
        hideFilter
        hideLegend
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
      {missingStride > 0 ? (
        <div>
          <Box variant="awsui-key-label">Missing STRIDE</Box>
          <SpaceBetween direction="horizontal" size="xxs">
            <Link variant="awsui-value-large" href="#ThreatList">
              {missingStride}
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

export default STRIDEAllocation;

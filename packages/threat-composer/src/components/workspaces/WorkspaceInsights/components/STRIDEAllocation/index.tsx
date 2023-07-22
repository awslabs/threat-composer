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
import { useState, useMemo } from 'react';
import { ALL_LEVELS, LEVEL_SELECTOR_OPTIONS_INCLUDING_ALL } from '../../../../../configs';
import { useThreatsContext } from '../../../../../contexts/ThreatsContext';
import filterThreatsByMetadata from '../../../../../utils/filterThreatsByMetadata';

const STRIDEAllocation = () => {
  const { statementList } = useThreatsContext();
  const [selectedPriority, setSelectedPriority] = useState<string | undefined>(ALL_LEVELS);

  const filteredStatementList = useMemo(() => {
    return filterThreatsByMetadata(statementList, 'Priority', selectedPriority);
  }, [statementList, selectedPriority]);

  const missingStride = useMemo(() => filterThreatsByMetadata(filteredStatementList, 'STRIDE').length, [filteredStatementList]);
  const countSpoofing = useMemo(() => filterThreatsByMetadata(filteredStatementList, 'STRIDE', 'S').length, [filteredStatementList]);
  const countTampering = useMemo(() => filterThreatsByMetadata(filteredStatementList, 'STRIDE', 'T').length, [filteredStatementList]);
  const countRepudiation = useMemo(() => filterThreatsByMetadata(filteredStatementList, 'STRIDE', 'R').length, [filteredStatementList]);
  const countInformationDisclosure = useMemo(() => filterThreatsByMetadata(filteredStatementList, 'STRIDE', 'I').length, [filteredStatementList]);
  const countDenialOfService = useMemo(() => filterThreatsByMetadata(filteredStatementList, 'STRIDE', 'D').length, [filteredStatementList]);
  const countElevationOfPrivilege = useMemo(() => filterThreatsByMetadata(filteredStatementList, 'STRIDE', 'E').length, [filteredStatementList]);

  console.log(countSpoofing, countTampering);

  return (
    <ColumnLayout columns={1} borders="horizontal">
      <FormField label="Filter by threat priority">
        <Select
          selectedOption={LEVEL_SELECTOR_OPTIONS_INCLUDING_ALL.find(x => x.value === selectedPriority) || null}
          onChange={({ detail }) => {
            setSelectedPriority(detail.selectedOption.value);
          }}
          options={LEVEL_SELECTOR_OPTIONS_INCLUDING_ALL}
        />
      </FormField>
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
        ariaLabel="Threat STRIDE Allocation Chart"
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

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
import {
  colorChartsPurple600,
  colorChartsYellow600,
} from '@cloudscape-design/design-tokens';
import { useState, useMemo } from 'react';
import { ALL_LEVELS, LEVEL_SELECTOR_OPTIONS_INCLUDING_ALL } from '../../../../../configs';
import { useThreatsContext } from '../../../../../contexts/ThreatsContext';
import filterThreatsByMetadata from '../../../../../utils/filterThreatsByMetadata';

const ThreatGrammar = () => {
  const { statementList } = useThreatsContext();

  const [selectedPriority, setSelectedPriority] = useState<string | undefined>(ALL_LEVELS);

  const filteredStatementList = useMemo(() => {
    return filterThreatsByMetadata(statementList, 'Priority', selectedPriority);
  }, [statementList, selectedPriority]);

  const countThreatSource = useMemo(() => filteredStatementList.filter((s) => s.threatSource).length, [filteredStatementList]);
  const countPrerequisites = useMemo(() => filteredStatementList.filter(
    (s) => s.prerequisites,
  ).length, [filteredStatementList]);
  const countThreatAction = useMemo(() => filteredStatementList.filter((s) => s.threatAction).length, [filteredStatementList]);
  const countThreatImpact = useMemo(() => filteredStatementList.filter((s) => s.threatImpact).length, [filteredStatementList]);
  const countImpactedGoal = useMemo(() => filteredStatementList.filter(
    (s) => s.impactedGoal?.length != 0,
  ).length, [filteredStatementList]);
  const countImpactedAssets = useMemo(() => filteredStatementList.filter(
    (s) => s.impactedAssets?.length != 0,
  ).length, [filteredStatementList]);
  const notUsingGrammar = useMemo(() => filteredStatementList.filter(
    (s) =>
      !s.threatSource &&
        !s.prerequisites &&
        !s.threatAction &&
        !s.threatImpact &&
        !s.impactedGoal?.length &&
        !s.impactedAssets?.length,
  ).length, [filteredStatementList]);

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
            title: 'Inputs for mitigation',
            type: 'bar',
            data: [
              { x: 'Threat source', y: countThreatSource },
              {
                x: 'Prerequistes',
                y: countPrerequisites,
              },
              {
                x: 'Threat action',
                y: countThreatAction,
              },
            ],
            color: colorChartsYellow600,
          },
          {
            title: 'Inputs for prioritisation',
            type: 'bar',
            data: [
              { x: 'Threat impact', y: countThreatImpact },
              {
                x: 'Impacted goal',
                y: countImpactedGoal,
              },
              {
                x: 'Impacted assets',
                y: countImpactedAssets,
              },
            ],
            color: colorChartsPurple600,
          },
        ]}
        ariaLabel="Threat Grammer Chart"
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
      {notUsingGrammar > 0 ? (
        <div>
          <Box variant="awsui-key-label">Not using grammar</Box>
          <SpaceBetween direction="horizontal" size="xxs">
            <Link variant="awsui-value-large" href="#ThreatList">
              {notUsingGrammar}
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

export default ThreatGrammar;

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

const ThreatGrammar = () => {
  const { statementList } = useThreatsContext();
  const countThreatSource = statementList.filter((s) => s.threatSource).length;
  const countPrerequisites = statementList.filter(
    (s) => s.prerequisites,
  ).length;
  const countThreatAction = statementList.filter((s) => s.threatAction).length;
  const countThreatImpact = statementList.filter((s) => s.threatImpact).length;
  const countImpactedGoal = statementList.filter(
    (s) => s.impactedGoal?.length != 0,
  ).length;
  const countImpactedAssets = statementList.filter(
    (s) => s.impactedAssets?.length != 0,
  ).length;
  const notUsingGrammar =
    statementList.filter(
      (s) =>
        !s.threatSource &&
        !s.prerequisites &&
        !s.threatAction &&
        !s.threatImpact &&
        !s.impactedGoal?.length &&
        !s.impactedAssets?.length,
    ).length;

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
          },
        ]}
        ariaLabel="Stacked, horizontal bar chart"
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

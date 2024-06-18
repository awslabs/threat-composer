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
  FormField,
  Select,
  ColumnLayout,
  BarChart,
  BarChartProps,
} from '@cloudscape-design/components';
import {
  colorChartsPaletteCategorical2,
  colorChartsPaletteCategorical1,
} from '@cloudscape-design/design-tokens';
import { useState, useMemo, useCallback, FC } from 'react';
import {
  ALL_LEVELS,
  LEVEL_SELECTOR_OPTIONS_INCLUDING_ALL,
  DEFAULT_NEW_ENTITY_ID,
} from '../../../../../configs';
import { useThreatsContext } from '../../../../../contexts/ThreatsContext';
import filterThreatsByMetadata from '../../../../../utils/filterThreatsByMetadata';
import DashboardNumber from '../../../../generic/DashboardNumber';
import { WorkspaceInsightsProps } from '../../types';

const ThreatGrammar: FC<WorkspaceInsightsProps> = ({
  onThreatEditorView,
}) => {
  const { statementList, addStatement } = useThreatsContext();

  const [selectedPriority, setSelectedPriority] = useState<string | undefined>(
    ALL_LEVELS,
  );

  const filteredStatementList = useMemo(() => {
    return filterThreatsByMetadata(statementList, 'Priority', selectedPriority);
  }, [statementList, selectedPriority]);

  const handleAddStatement = useCallback(() => {
    addStatement();
    onThreatEditorView?.(DEFAULT_NEW_ENTITY_ID);
  }, [addStatement, onThreatEditorView]);

  const countThreatSource = useMemo(
    () => filteredStatementList.filter((s) => s.threatSource).length,
    [filteredStatementList],
  );
  const countPrerequisites = useMemo(
    () => filteredStatementList.filter((s) => s.prerequisites).length,
    [filteredStatementList],
  );
  const countThreatAction = useMemo(
    () => filteredStatementList.filter((s) => s.threatAction).length,
    [filteredStatementList],
  );
  const countThreatImpact = useMemo(
    () => filteredStatementList.filter((s) => s.threatImpact).length,
    [filteredStatementList],
  );
  const countImpactedGoal = useMemo(
    () =>
      filteredStatementList.filter(
        (s) => s.impactedGoal && s.impactedGoal?.length != 0,
      ).length,
    [filteredStatementList],
  );
  const countImpactedAssets = useMemo(
    () =>
      filteredStatementList.filter(
        (s) => s.impactedAssets && s.impactedAssets?.length != 0,
      ).length,
    [filteredStatementList],
  );
  const notUsingGrammar = useMemo(
    () =>
      filteredStatementList.filter(
        (s) =>
          !s.threatSource &&
          !s.prerequisites &&
          !s.threatAction &&
          !s.threatImpact &&
          !s.impactedGoal?.length &&
          !s.impactedAssets?.length,
      ).length,
    [filteredStatementList],
  );

  let barSeries: BarChartProps<string>['series'] = [
    {
      title: 'Inputs for mitigation',
      type: 'bar',
      data: [
        { x: 'Threat source', y: countThreatSource },
        {
          x: 'Prerequisites',
          y: countPrerequisites,
        },
        {
          x: 'Threat action',
          y: countThreatAction,
        },
      ],
      color: colorChartsPaletteCategorical2,
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
      color: colorChartsPaletteCategorical1,
    },
  ];

  return (
    <ColumnLayout columns={1} borders="horizontal">
      {!statementList.length ? (
        <Box
          margin="xxl"
          padding="xxl"
          color="text-body-secondary"
          textAlign="center"
        >
          <b>No threats available</b>
          <Box variant="p" color="text-body-secondary">
            Start by adding a threat to this workspace
          </Box>
          <Button variant="primary" onClick={() => handleAddStatement()}>Add a threat</Button>
        </Box>
      ) : (
        <div>
          <FormField label="Filter by threat priority">
            <Select
              selectedOption={
                LEVEL_SELECTOR_OPTIONS_INCLUDING_ALL.find(
                  (x) => x.value === selectedPriority,
                ) || null
              }
              onChange={({ detail }) => {
                setSelectedPriority(detail.selectedOption.value);
              }}
              options={LEVEL_SELECTOR_OPTIONS_INCLUDING_ALL}
            />
          </FormField>
          {!filteredStatementList.length ? (
            <Box
              margin="xxl"
              padding="xxl"
              color="text-body-secondary"
              textAlign="center"
            >
              <b>No threats meet the filter criteria</b>
            </Box>
          ) : (
            <Box padding="s">
              <BarChart
                series={barSeries}
                ariaLabel="Threat Grammer Chart"
                emphasizeBaselineAxis={false}
                height={245}
                hideFilter
                horizontalBars
                stackedBars
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
            </Box>
          )}
        </div>
      )}
      {notUsingGrammar > 0 ? (
        <div>
          <Box variant="awsui-key-label">Not using grammar</Box>
          <DashboardNumber
            showWarning
            displayedNumber={notUsingGrammar}
          />
        </div>
      ) : null}
    </ColumnLayout>
  );
};

export default ThreatGrammar;

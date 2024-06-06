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
  ColumnLayout,
} from '@cloudscape-design/components';
import PieChart from '@cloudscape-design/components/pie-chart';
import {
  colorChartsStatusInfo,
  colorChartsStatusPositive,
  colorChartsStatusHigh,
  colorChartsStatusNeutral,
} from '@cloudscape-design/design-tokens';
import { useMemo, useCallback, FC } from 'react';
import {
  LEVEL_HIGH,
  LEVEL_LOW,
  LEVEL_MEDIUM,
  LEVEL_NOT_SET,
  DEFAULT_NEW_ENTITY_ID,
} from '../../../../../configs';
import { useThreatsContext } from '../../../../../contexts/ThreatsContext';
import filterThreatsByMetadata from '../../../../../utils/filterThreatsByMetadata';
import DashboardNumber from '../../../../generic/DashboardNumber';
import useLinkClicked from '../../hooks/useLinkClicked';
import { WorkspaceInsightsProps } from '../../types';

const ThreatPrioritization: FC<WorkspaceInsightsProps> = ({
  onThreatEditorView,
}) => {
  const { statementList, addStatement } = useThreatsContext();

  const handleLinkClicked = useLinkClicked();

  const missingPriority = useMemo(
    () => filterThreatsByMetadata(statementList, 'Priority').length,
    [statementList],
  );

  const countHigh = useMemo(
    () => filterThreatsByMetadata(statementList, 'Priority', LEVEL_HIGH).length,
    [statementList],
  );
  const countMed = useMemo(
    () =>
      filterThreatsByMetadata(statementList, 'Priority', LEVEL_MEDIUM).length,
    [statementList],
  );
  const countLow = useMemo(
    () => filterThreatsByMetadata(statementList, 'Priority', LEVEL_LOW).length,
    [statementList],
  );

  const handleAddStatement = useCallback(() => {
    addStatement();
    onThreatEditorView?.(DEFAULT_NEW_ENTITY_ID);
  }, [addStatement, onThreatEditorView]);

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
        <Box padding="s">
          <PieChart
            data={[
              {
                title: 'High',
                value: countHigh,
                color: colorChartsStatusHigh,
              },
              {
                title: 'Medium',
                value: countMed,
                color: colorChartsStatusInfo,
              },
              {
                title: 'Low',
                value: countLow,
                color: colorChartsStatusPositive,
              },
              {
                title: 'Undefined',
                value: missingPriority,
                color: colorChartsStatusNeutral,
              },
            ]}
            detailPopoverContent={(datum, sum) => [
              { key: 'Threat count', value: datum.value },
              {
                key: 'Percentage',
                value: `${((datum.value / sum) * 100).toFixed(0)}%`,
              },
            ]}
            segmentDescription={(datum, sum) =>
              `${datum.value} threats, ${((datum.value / sum) * 100).toFixed(0)}%`
            }
            ariaDescription="Pie chart showing the prioritization of threats."
            ariaLabel="Pie chart"
            hideFilter
            innerMetricDescription="Threats"
            innerMetricValue={statementList.length.toString()}
            variant="donut"
            size="medium"
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
      {missingPriority > 0 ? (
        <div>
          <Box variant="awsui-key-label">Missing priority</Box>
          <DashboardNumber
            showWarning
            displayedNumber={missingPriority}
            onLinkClicked={handleLinkClicked({
              priority: LEVEL_NOT_SET,
            })}
          />
        </div>
      ) : null}
    </ColumnLayout>
  );
};
export default ThreatPrioritization;

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
  threatStatus, STATUS_NOT_SET,
  THREAT_STATUS_IDENTIFIED,
  THREAT_STATUS_NOT_USEFUL,
  THREAT_STATUS_RESOLVED,
} from '@aws/threat-composer-core';
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
  DEFAULT_NEW_ENTITY_ID,
} from '../../../../../configs';
import { useThreatsContext } from '../../../../../contexts/ThreatsContext';
import DashboardNumber from '../../../../generic/DashboardNumber';
import useThreatListLinkClicked from '../../hooks/useThreatListLinkClicked';
import { WorkspaceInsightsProps } from '../../types';

const ThreatStatus: FC<WorkspaceInsightsProps> = ({
  onThreatEditorView,
  onThreatListView,
}) => {
  const { statementList, addStatement } = useThreatsContext();

  const handleLinkClicked = useThreatListLinkClicked(onThreatListView);

  const countNotSet = useMemo(() => statementList.filter(x => !x.status).length,
    [statementList],
  );

  const countIdentified = useMemo(
    () => statementList.filter(x => x.status === THREAT_STATUS_IDENTIFIED).length,
    [statementList],
  );

  const countResolved = useMemo(
    () => statementList.filter(x => x.status === THREAT_STATUS_RESOLVED).length,
    [statementList],
  );

  const countNotUseful = useMemo(
    () => statementList.filter(x => x.status === THREAT_STATUS_NOT_USEFUL).length,
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
                title: threatStatus.find(x => x.value === THREAT_STATUS_RESOLVED)?.label || 'Resolved',
                value: countResolved,
                color: colorChartsStatusPositive,
              },
              {
                title: threatStatus.find(x => x.value === THREAT_STATUS_NOT_USEFUL)?.label || 'Not useful',
                value: countNotUseful,
                color: colorChartsStatusInfo,
              },
              {
                title: threatStatus.find(x => x.value === THREAT_STATUS_IDENTIFIED)?.label || 'Identified',
                value: countIdentified,
                color: colorChartsStatusNeutral,
              },
              {
                title: 'Not Set',
                value: countNotSet,
                color: colorChartsStatusHigh,
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
            ariaDescription="Pie chart showing the status of threats."
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
      {countNotSet > 0 ? (
        <div>
          <Box variant="awsui-key-label">Missing status</Box>
          <DashboardNumber
            showWarning
            featuredNumber={countNotSet}
            onLinkClicked={handleLinkClicked({
              status: [STATUS_NOT_SET],
            })}
          />
        </div>
      ) : null}
    </ColumnLayout>
  );
};
export default ThreatStatus;

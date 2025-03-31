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
import { mitigationStatus } from '@aws/threat-composer-core';
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
  colorChartsStatusLow,
} from '@cloudscape-design/design-tokens';
import { useMemo, useCallback, FC } from 'react';
import {
  MITIGATION_STATUS_IDENTIFIED,
  MITIGATION_STATUS_IN_PROGRESS,
  MITIGATION_STATUS_RESOLVED,
  MITIGATION_STATUS_RESOLVED_WILLNOTACTION,
  STATUS_NOT_SET,
} from '../../../../../configs';
import { useMitigationsContext } from '../../../../../contexts/MitigationsContext';
import DashboardNumber from '../../../../generic/DashboardNumber';
import useMitigationListLinkClicked from '../../hooks/useMitigationListLinkClicked';
import { WorkspaceInsightsProps } from '../../types';

const MitigationStatus: FC<WorkspaceInsightsProps> = ({
  onMitigationListView,
}) => {
  const { mitigationList } = useMitigationsContext();

  const handleLinkClicked = useMitigationListLinkClicked(onMitigationListView);

  const countNotSet = useMemo(() => mitigationList.filter(x => !x.status).length,
    [mitigationList],
  );

  const countIdentified = useMemo(
    () => mitigationList.filter(x => x.status === MITIGATION_STATUS_IDENTIFIED).length,
    [mitigationList],
  );

  const countResolved = useMemo(
    () => mitigationList.filter(x => x.status === MITIGATION_STATUS_RESOLVED).length,
    [mitigationList],
  );

  const countInProgress = useMemo(
    () => mitigationList.filter(x => x.status === MITIGATION_STATUS_IN_PROGRESS).length,
    [mitigationList],
  );

  const countWillNotAction = useMemo(
    () => mitigationList.filter(x => x.status === MITIGATION_STATUS_RESOLVED_WILLNOTACTION).length,
    [mitigationList],
  );

  const handleAddMitigation = useCallback(() => {
    onMitigationListView?.();
  }, [mitigationList, onMitigationListView]);

  return (
    <ColumnLayout columns={1} borders="horizontal">
      {!mitigationList.length ? (
        <Box
          margin="xxl"
          padding="xxl"
          color="text-body-secondary"
          textAlign="center"
        >
          <b>No mitigations available</b>
          <Box variant="p" color="text-body-secondary">
            Start by adding a mitigation to this workspace
          </Box>
          <Button variant="primary" onClick={() => handleAddMitigation()}>Add a mitigation</Button>
        </Box>
      ) : (
        <Box padding="s">
          <PieChart
            data={[
              {
                title: mitigationStatus.find(x => x.value === MITIGATION_STATUS_RESOLVED)?.label || 'Resolved',
                value: countResolved,
                color: colorChartsStatusPositive,
              },
              {
                title: mitigationStatus.find(x => x.value === MITIGATION_STATUS_RESOLVED_WILLNOTACTION)?.label || 'Will not action',
                value: countWillNotAction,
                color: colorChartsStatusLow,
              },
              {
                title: mitigationStatus.find(x => x.value === MITIGATION_STATUS_IN_PROGRESS)?.label || 'In-progress',
                value: countInProgress,
                color: colorChartsStatusInfo,
              },
              {
                title: mitigationStatus.find(x => x.value === MITIGATION_STATUS_IDENTIFIED)?.label || 'Identified',
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
              { key: 'Mitigation count', value: datum.value },
              {
                key: 'Percentage',
                value: `${((datum.value / sum) * 100).toFixed(0)}%`,
              },
            ]}
            segmentDescription={(datum, sum) =>
              `${datum.value} mitigations, ${((datum.value / sum) * 100).toFixed(0)}%`
            }
            ariaDescription="Pie chart showing the status of mitigations."
            ariaLabel="Pie chart"
            hideFilter
            innerMetricDescription="Mitigations"
            innerMetricValue={mitigationList.length.toString()}
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
export default MitigationStatus;

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
/** @jsxImportSource @emotion/react */

import Icon from '@cloudscape-design/components/icon';
import Link, { LinkProps } from '@cloudscape-design/components/link';
import SpaceBetween from '@cloudscape-design/components/space-between';
import { css } from '@emotion/react';
import { FC } from 'react';

const styles = {
  link: css({
    '& a': {
      textDecoration: 'none !important',
    },
  }),
};

export interface DashboardNumberProps {
  displayedNumber: number;
  showWarning?: boolean;
  onLinkClicked?: LinkProps['onFollow'];
}

const DashboardNumber: FC<DashboardNumberProps> = ({
  showWarning, displayedNumber, onLinkClicked,
}) => {
  return <div css={styles.link}>
    {showWarning && displayedNumber > 0 ? (
      <SpaceBetween direction="horizontal" size="xxs">
        <Link
          variant="awsui-value-large"
          href="#"
          onFollow={onLinkClicked}>
          {displayedNumber}
        </Link>
        <Icon name="status-warning" variant="warning" />
      </SpaceBetween>
    ) : (
      <Link
        variant="awsui-value-large"
        href="#"
        onFollow={onLinkClicked}>
        {displayedNumber}
      </Link>
    )}
  </div>;
};

export default DashboardNumber;
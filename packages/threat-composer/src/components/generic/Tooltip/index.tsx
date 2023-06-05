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
import * as awsui from '@cloudscape-design/design-tokens';
import { css } from '@emotion/react';
import React, { FC, PropsWithChildren } from 'react';
import { useMobileMediaQuery } from '../../../hooks/useMediaQuery';

const styles = {
  tooltip: css({
    'position': 'relative',
    ['&:hover .tooltipText']: {
      visibility: 'visible',
    },
    '& .tooltipText': {
      visibility: 'hidden',
      backgroundColor: 'black',
      color: '#fff',
      textAlign: 'center',
      borderRadius: awsui.borderRadiusBadge,
      padding: awsui.spaceScaledXxs,
      position: 'absolute',
      zIndex: '100',
      lineHeight: '20px',
      fontSize: '14px !important',
      fontWeight: '500 !important',
    },
  }),
  tooltipAnchor: css({
    'width': '110px',
    'left': '50%',
    'marginLeft': '-56px',
    '&.tooltipText::after': {
      content: '" "',
      position: 'absolute',
      left: '50%',
      marginLeft: '-5px',
      borderWidth: '5px',
      borderStyle: 'solid',
      borderColor: 'black transparent transparent transparent',
    },
  }),
  tooltipTop: css({
    'bottom': '125%',
    '&.tooltipText::after': {
      top: '100%',
    },
  }),
  tooltipBottom: css({
    'top': '110%',
    '&.tooltipText::after': {
      bottom: '100%',
    },
  }),
};

export interface TooltipProps {
  tooltip: React.ReactNode;
  anchor?: 'top' | 'bottom';
}

const Tooltip: FC<PropsWithChildren<TooltipProps>> = ({
  tooltip,
  children,
  anchor = 'top',
}) => {
  const isMobileView = useMobileMediaQuery();
  return isMobileView ? <>{children}</> : (<span css={styles.tooltip}>
    {children}
    <span css={[styles.tooltipAnchor, anchor === 'top' ? styles.tooltipTop : styles.tooltipBottom]} className='tooltipText'>{tooltip}</span>
  </span>);
};

export default Tooltip;
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
import { FC, PropsWithChildren } from 'react';
import Tooltip from '../../../../generic/Tooltip';

export interface TokenProps {
  onClick: () => void;
  highlighted?: boolean;
  filled?: boolean;
  tooltip?: string;
}

const Token: FC<PropsWithChildren<TokenProps>> = ({
  children,
  onClick,
  highlighted,
  filled,
  tooltip,
}) => {
  const bgColor = highlighted ?
    awsui.colorBackgroundToggleCheckedDisabled :
    (filled ? awsui.colorBackgroundItemSelected : awsui.colorBackgroundButtonPrimaryDisabled);

  return (<Tooltip tooltip={tooltip}>
    <button
      css={css`
        text-align: left;
        text-decoration: none;
        border-spacing: 0;
        border-collapse: separate;
        border: 1px solid;
        border-radius: ${awsui.borderRadiusBadge};
        height: fit-content !important;
        padding: ${awsui.spaceScaledXxs};
        color: ${awsui.colorTextBodyDefault};
        background-color: ${bgColor};
      `} onClick={onClick}>
      <span>{children}</span>
    </button>
  </Tooltip>
  );
};

export default Token;
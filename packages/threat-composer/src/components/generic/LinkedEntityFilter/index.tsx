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
import Box from '@cloudscape-design/components/box';
import SegmentedControl from '@cloudscape-design/components/segmented-control';
import * as awsui from '@cloudscape-design/design-tokens';
import { css } from '@emotion/react';
import { FC } from 'react';
import svgStyles from '../../../styles/svg';
import Tooltip from '../Tooltip';

export const WITHOUT_NO_LINKED_ENTITY = 'WITHOUT_LINKED_ENTITY';
export const ALL = 'ALL';
export const WITH_LINKED_ENTITY = 'WITH_LINKED_ENTITY';

export interface LinkedEntityFilterProps {
  label: string;
  entityDisplayName: string;
  selected?: string;
  setSelected: (selected: string) => void;
}

const styles = {
  root: css({
    display: 'flex',
    alignItems: 'center',
    gap: awsui.spaceScaledS,
  }),
};

const LinkedEntityFilter: FC<LinkedEntityFilterProps> = ({
  selected = ALL,
  setSelected,
  entityDisplayName,
  label,
}) => {
  return (<div css={styles.root}>
    <Box variant='awsui-key-label'>{label}</Box>
    <SegmentedControl
      selectedId={selected}
      onChange={({ detail }) =>
        setSelected(detail.selectedId)
      }
      options={[
        {
          iconAlt: `Without linked ${entityDisplayName}`,
          id: WITHOUT_NO_LINKED_ENTITY,
          iconSvg: (<Tooltip tooltip={`Show threats without linked ${entityDisplayName}`}>
            <svg css={svgStyles} aria-hidden="true" viewBox="0 0 24 24" data-testid="LinkOffIcon">
              <path d="M17 7h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1 0 1.43-.98 2.63-2.31 2.98l1.46 1.46C20.88 15.61 22 13.95 22 12c0-2.76-2.24-5-5-5zm-1 4h-2.19l2 2H16zM2 4.27l3.11 3.11C3.29 8.12 2 9.91 2 12c0 2.76 2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1 0-1.59 1.21-2.9 2.76-3.07L8.73 11H8v2h2.73L13 15.27V17h1.73l4.01 4L20 19.74 3.27 3 2 4.27z"></path>
            </svg>
          </Tooltip>),
        },
        {
          iconAlt: 'All',
          id: ALL,
          iconSvg: (<Tooltip tooltip='Show all threats'>
            <svg css={svgStyles} aria-hidden="true" viewBox="0 0 24 24" data-testid="AllInclusiveIcon">
              <path d="M18.6 6.62c-1.44 0-2.8.56-3.77 1.53L12 10.66 10.48 12h.01L7.8 14.39c-.64.64-1.49.99-2.4.99-1.87 0-3.39-1.51-3.39-3.38S3.53 8.62 5.4 8.62c.91 0 1.76.35 2.44 1.03l1.13 1 1.51-1.34L9.22 8.2C8.2 7.18 6.84 6.62 5.4 6.62 2.42 6.62 0 9.04 0 12s2.42 5.38 5.4 5.38c1.44 0 2.8-.56 3.77-1.53l2.83-2.5.01.01L13.52 12h-.01l2.69-2.39c.64-.64 1.49-.99 2.4-.99 1.87 0 3.39 1.51 3.39 3.38s-1.52 3.38-3.39 3.38c-.9 0-1.76-.35-2.44-1.03l-1.14-1.01-1.51 1.34 1.27 1.12c1.02 1.01 2.37 1.57 3.82 1.57 2.98 0 5.4-2.41 5.4-5.38s-2.42-5.37-5.4-5.37z"></path>
            </svg>
          </Tooltip>),
        },
        {
          iconAlt: `With ${entityDisplayName}`,
          id: WITH_LINKED_ENTITY,
          iconSvg: (<Tooltip tooltip={`Show threats with linked ${entityDisplayName}`}>
            <svg css={svgStyles} aria-hidden="true" viewBox="0 0 24 24" data-testid="LinkIcon">
              <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"></path>
            </svg>
          </Tooltip>),
        },
      ]}
    /></div>);
};

export default LinkedEntityFilter;
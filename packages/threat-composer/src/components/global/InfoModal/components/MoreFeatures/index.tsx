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
import Grid from '@cloudscape-design/components/grid';
import { css } from '@emotion/react';
import { FC } from 'react';
import styles from '../../styles';
import InfoModalBase from '../InfoModalBase';

const InfoModalMoreFeatures: FC = () => {
  return (<InfoModalBase title={<>More Features</>}>
    <div css={css(styles.featureSets)} >
      <Grid gridDefinition={[
        { colspan: { default: 12, xxs: 4 } },
        { colspan: { default: 12, xxs: 4 } },
        { colspan: { default: 12, xxs: 4 } },
      ]}>
        <div css={[css(styles.featureSet), css(styles.contentBaseText)]}>
          <div><svg focusable="false" aria-hidden="true" viewBox="0 0 24 24" data-testid="LaptopIcon" fill='#d1d5db'>
            <path d="M20 18c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z"></path>
          </svg></div>
          <div><span css={css(styles.contentHighlight)}>Data persisted only client-side</span> within the browser</div>
        </div>
        <div css={[css(styles.featureSet), css(styles.contentBaseText)]}>
          <div><svg focusable="false" aria-hidden="true" viewBox="0 0 24 24" data-testid="CloudDownloadIcon" fill='#d1d5db'>
            <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"></path>
          </svg></div>
          <div><span css={css(styles.contentHighlight)}>Import/export capabilities</span> to enable persistent storage and sharing</div>
        </div>
        <div css={[css(styles.featureSet), css(styles.contentBaseText)]}>
          <div><svg focusable="false" aria-hidden="true" viewBox="0 0 24 24" data-testid="AppsIcon" fill='#d1d5db'>
            <path d="M4 8h4V4H4v4zm6 12h4v-4h-4v4zm-6 0h4v-4H4v4zm0-6h4v-4H4v4zm6 0h4v-4h-4v4zm6-10v4h4V4h-4zm-6 4h4V4h-4v4zm6 6h4v-4h-4v4zm0 6h4v-4h-4v4z"></path>
          </svg></div>
          <div><span css={css(styles.contentHighlight)}>Workspace separation</span> to cater for multiple solution requirements</div>
        </div>
      </Grid>
    </div>
  </InfoModalBase >);
};

export default InfoModalMoreFeatures;
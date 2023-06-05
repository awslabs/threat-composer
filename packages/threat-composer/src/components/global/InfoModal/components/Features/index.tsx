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

const InfoModalFeatures: FC = () => {
  return (<InfoModalBase title={<>Features</>}>
    <div css={css(styles.featureSets)}>
      <Grid gridDefinition={[
        { colspan: { default: 12, xxs: 6 } },
        { colspan: { default: 12, xxs: 6 } },
        { colspan: { default: 12, xxs: 6 } },
        { colspan: { default: 12, xxs: 6 } },
      ]}>
        <div css={[css(styles.featureSet), css(styles.contentBaseText)]}>
          <div><svg focusable="false" aria-hidden="true" viewBox="0 0 24 24" data-testid="FoundationIcon" fill='#d1d5db'>
            <path d="M19 12h3L12 3 2 12h3v3H3v2h2v3h2v-3h4v3h2v-3h4v3h2v-3h2v-2h-2v-3zM7 15v-4.81l4-3.6V15H7zm6 0V6.59l4 3.6V15h-4z"></path>
          </svg></div>
          <div>Renders <span css={css(styles.contentHighlight)}>structured threat statements</span> based on user input</div>
        </div>
        <div css={[css(styles.featureSet), css(styles.contentBaseText)]}>
          <div><svg focusable="false" aria-hidden="true" viewBox="0 0 24 24" data-testid="DisplaySettingsIcon" fill='#d1d5db'>
            <path d="M20 3H4c-1.11 0-2 .89-2 2v12c0 1.1.89 2 2 2h4v2h8v-2h4c1.1 0 2-.9 2-2V5c0-1.11-.9-2-2-2zm0 14H4V5h16v12z"></path>
            <path d="M6 8.25h8v1.5H6zm10.5 1.5H18v-1.5h-1.5V7H15v4h1.5zm-6.5 2.5h8v1.5h-8zM7.5 15H9v-4H7.5v1.25H6v1.5h1.5z"></path>
          </svg></div>
          <div>
            <span css={css(styles.contentHighlight)}>
              Adaptive threat statement structure
            </span> to support progressively more complete user input
          </div>
        </div>
        <div css={[css(styles.featureSet), css(styles.contentBaseText)]}>
          <div><svg focusable="false" aria-hidden="true" viewBox="0 0 24 24" data-testid="AssistantIcon" fill='#d1d5db'>
            <path d="M19 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h4l3 3 3-3h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-5.12 10.88L12 17l-1.88-4.12L6 11l4.12-1.88L12 5l1.88 4.12L18 11l-4.12 1.88z"></path>
          </svg></div>
          <div><span css={css(styles.contentHighlight)}>Dynamic suggestions</span> based on supplied and missing user input</div>
        </div>
        <div css={[css(styles.featureSet), css(styles.contentBaseText)]}>
          <div><svg focusable="false" aria-hidden="true" viewBox="0 0 24 24" data-testid="PsychologyIcon" fill='#d1d5db'>
            <path d="M13 8.57c-.79 0-1.43.64-1.43 1.43s.64 1.43 1.43 1.43 1.43-.64 1.43-1.43-.64-1.43-1.43-1.43z"></path>
            <path d="M13 3C9.25 3 6.2 5.94 6.02 9.64L4.1 12.2c-.25.33-.01.8.4.8H6v3c0 1.1.9 2 2 2h1v3h7v-4.68c2.36-1.12 4-3.53 4-6.32 0-3.87-3.13-7-7-7zm3 7c0 .13-.01.26-.02.39l.83.66c.08.06.1.16.05.25l-.8 1.39c-.05.09-.16.12-.24.09l-.99-.4c-.21.16-.43.29-.67.39L14 13.83c-.01.1-.1.17-.2.17h-1.6c-.1 0-.18-.07-.2-.17l-.15-1.06c-.25-.1-.47-.23-.68-.39l-.99.4c-.09.03-.2 0-.25-.09l-.8-1.39c-.05-.08-.03-.19.05-.25l.84-.66c-.01-.13-.02-.26-.02-.39s.02-.27.04-.39l-.85-.66c-.08-.06-.1-.16-.05-.26l.8-1.38c.05-.09.15-.12.24-.09l1 .4c.2-.15.43-.29.67-.39L12 6.17c.02-.1.1-.17.2-.17h1.6c.1 0 .18.07.2.17l.15 1.06c.24.1.46.23.67.39l1-.4c.09-.03.2 0 .24.09l.8 1.38c.05.09.03.2-.05.26l-.85.66c.03.12.04.25.04.39z"></path>
          </svg></div>
          <div>Complete threat statement <span css={css(styles.contentHighlight)}>examples to aid contextual brainstorming</span> and re-use</div>
        </div>
      </Grid>
    </div>
  </InfoModalBase>);
};

export default InfoModalFeatures;
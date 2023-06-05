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

const InfoModalIntro: FC = () => {
  return (<InfoModalBase title='threat-composer'>
    <p>This tool has <span css={css(styles.contentHighlight)}>
      a singular focus on the <i>“What can go wrong?”</i> threat modeling step</span>, with the aim of making it faster and easier for you to
    </p>
    <div css={css(styles.featureSets)}>
      <Grid gridDefinition={[
        { colspan: { default: 12, xxs: 6 } },
        { colspan: { default: 12, xxs: 6 } },
      ]}>
        <div css={[css(styles.featureSet), css(styles.contentBaseText)]}>
          <div><svg focusable="false" aria-hidden="true" viewBox="0 0 24 24" data-testid="PsychologyIcon" fill='#d1d5db'>
            <path d="M13 8.57c-.79 0-1.43.64-1.43 1.43s.64 1.43 1.43 1.43 1.43-.64 1.43-1.43-.64-1.43-1.43-1.43z"></path><path d="M13 3C9.25 3 6.2 5.94 6.02 9.64L4.1 12.2c-.25.33-.01.8.4.8H6v3c0 1.1.9 2 2 2h1v3h7v-4.68c2.36-1.12 4-3.53 4-6.32 0-3.87-3.13-7-7-7zm3 7c0 .13-.01.26-.02.39l.83.66c.08.06.1.16.05.25l-.8 1.39c-.05.09-.16.12-.24.09l-.99-.4c-.21.16-.43.29-.67.39L14 13.83c-.01.1-.1.17-.2.17h-1.6c-.1 0-.18-.07-.2-.17l-.15-1.06c-.25-.1-.47-.23-.68-.39l-.99.4c-.09.03-.2 0-.25-.09l-.8-1.39c-.05-.08-.03-.19.05-.25l.84-.66c-.01-.13-.02-.26-.02-.39s.02-.27.04-.39l-.85-.66c-.08-.06-.1-.16-.05-.26l.8-1.38c.05-.09.15-.12.24-.09l1 .4c.2-.15.43-.29.67-.39L12 6.17c.02-.1.1-.17.2-.17h1.6c.1 0 .18.07.2.17l.15 1.06c.24.1.46.23.67.39l1-.4c.09-.03.2 0 .24.09l.8 1.38c.05.09.03.2-.05.26l-.85.66c.03.12.04.25.04.39z"></path>
          </svg></div>
          <span>Focus your brainstorming of custom and contextual threats</span>
        </div>
        <div css={[css(styles.featureSet), css(styles.contentBaseText)]}>
          <div><svg focusable="false" aria-hidden="true" viewBox="0 0 24 24" data-testid="LoopIcon" fill='#d1d5db'>
            <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"></path>
          </svg></div>
          <span>Iteratively compose useful threats with the time you have available</span>
        </div>
      </Grid>
    </div>
  </InfoModalBase>);
};

export default InfoModalIntro;
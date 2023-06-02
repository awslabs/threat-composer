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
import { css } from '@emotion/react';
import { FC } from 'react';
import threatStatementElements from '../../../../../assets/threat-statement-elements.png';
import styles from '../../styles';
import InfoModalBase from '../InfoModalBase';

const InfoModalSelector: FC = () => {
  return (<InfoModalBase>
    <p>A useful threat statement considers <span css={css(styles.contentHighlight)}>threat source</span>,{' '}
      <span css={css(styles.contentHighlight)}>prerequisites</span>,{' '}
      <span css={css(styles.contentHighlight)}>threat action</span>,{' '}
      <span css={css(styles.contentHighlight)}>threat impact</span>,{' '}
      <span css={css(styles.contentHighlight)}>impacted goal</span>{' '}
      and <span css={css(styles.contentHighlight)}>impacted assets</span>.</p>
    <p>This tool empowers you to compose useful threat statements by providing examples and suggestions
      for each section and generating the final statement for you.</p>
    <img css={css(styles.image)} src={threatStatementElements} alt="ThreatStatementElements" />
  </InfoModalBase>);
};

export default InfoModalSelector;
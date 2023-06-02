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
import Button from '@cloudscape-design/components/button';
import { css } from '@emotion/react';
import { FC } from 'react';
import styles from '../../styles';
import InfoModalBase from '../InfoModalBase';

export interface InfoModalGetStartedProps {
  onClick: () => void;
}

const InfoModalGetStarted: FC<InfoModalGetStartedProps> = ({ onClick }) => {
  return (<InfoModalBase title='Guiding principles of this tool'>
    <div css={css(styles.contentList)}>
      <ol>
        <li>Do one thing, well</li>
        <li>Optimise for approachability over completeness</li>
        <li>Encourage (not mandate) more complete threat statements</li>
        <li>Spur creativity through example</li>
        <li>Support iterative threat statement writing</li>
        <li>No user-supplied data leaves the browser</li>
      </ol>
    </div>
    <div css={css(styles.getStartedBtnContainer)}>
      <Button onClick={onClick} variant='primary'>
        Get Started
      </Button>
    </div>
  </InfoModalBase>);
};

export default InfoModalGetStarted;
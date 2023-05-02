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
import { FC } from 'react';
import threatStatementElements from '../../../../../assets/threat-statement-elements.png';
import InfoModalBase from '../InfoModalBase';

const InfoModalSelector: FC = () => {
  return (<InfoModalBase>
    <p>A useful threat statement considers <span className='threat-statement-editor-info-model-content-highlight'>threat source</span>,{' '}
      <span className='threat-statement-editor-info-model-content-highlight'>prerequisites</span>,{' '}
      <span className='threat-statement-editor-info-model-content-highlight'>threat action</span>,{' '}
      <span className='threat-statement-editor-info-model-content-highlight'>threat impact</span>,{' '}
      <span className='threat-statement-editor-info-model-content-highlight'>impacted goal</span>{' '}
      and <span className='threat-statement-editor-info-model-content-highlight'>impacted assets</span>.</p>
    <p>This tool empowers you to compose useful threat statements by providing examples and suggestions
      for each section and generating the final statement for you.</p>
    <img width='740px' src={threatStatementElements} alt="ThreatStatementElements" style={{
      marginTop: '20px',
    }}/>
  </InfoModalBase>);
};

export default InfoModalSelector;
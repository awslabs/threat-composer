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
import Header from '@cloudscape-design/components/header';
import { FC } from 'react';
import { useDataflowInfoContext } from '../../../../../contexts/DataflowContext/context';
import MarkdownViewer from '../../../../generic/MarkdownViewer';

const Dataflow: FC = () => {
  const { dataflowInfo } = useDataflowInfoContext();
  return (<div>
    <Header variant='h2'>Dataflow</Header>
    <Header variant='h3' key='diagramInfo'>Introduction</Header>
    <MarkdownViewer>
      {dataflowInfo.description || ''}
    </MarkdownViewer>
    <Header variant='h3' key='diagram'>Dataflow Diagram</Header>
    {dataflowInfo.image && <img width={1024} src={dataflowInfo.image} alt='Dataflow Diagram' />}
  </div>);
};

export default Dataflow;
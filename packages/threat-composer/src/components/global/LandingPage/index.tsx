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
import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import ColumnLayout from '@cloudscape-design/components/column-layout';
import Container from '@cloudscape-design/components/container';
import ContentLayout from '@cloudscape-design/components/content-layout';
import Header from '@cloudscape-design/components/header';
import SpaceBetween from '@cloudscape-design/components/space-between';
import TextContent from '@cloudscape-design/components/text-content';
import { FC } from 'react';
import HowItWorks from '../../../assets/how-it-works.png';
import { useGlobalSetupContext } from '../../../contexts';

const LandingPage: FC = () => {
  const { onShowImport, onDefineWorkload } = useGlobalSetupContext();
  return (<ContentLayout header={<Header
    variant="h1"
    description="A threat modeling tool to help humans to reduce time-to-value when threat modeling"
    actions={
      <SpaceBetween direction='horizontal' size='s'>
        <Button onClick={onShowImport}>Import existing</Button>
        <Button variant="primary" onClick={onDefineWorkload}>Define workload or feature</Button>
      </SpaceBetween>
    }>Threat Composer</Header>}>
    <Container>
      <SpaceBetween direction='vertical' size='s'>
        <Box variant='h2'>How it works</Box>
        <Box padding='s'><img src={HowItWorks} width='100%'/></Box>
        <Box variant='h2'>Benefits and features</Box>
        <ColumnLayout columns={2}>
          <TextContent>
            <h3>Reduce time-to-value when performing threat modeling</h3>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt
              ut labore et dolore magna aliqua. Ut enim ad minim veniam,
              quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. </p>
          </TextContent>
          <TextContent>
            <h3>Threat-models-as-code</h3>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt
              ut labore et dolore magna aliqua. Ut enim ad minim veniam,
              quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. </p>
          </TextContent>
        </ColumnLayout>
      </SpaceBetween>
    </Container>
  </ContentLayout>);
};

export default LandingPage;
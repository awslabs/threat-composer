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
import { Button, Header, SpaceBetween } from '@cloudscape-design/components';
import Box from '@cloudscape-design/components/box';
import Container from '@cloudscape-design/components/container';
import ContentLayout from '@cloudscape-design/components/content-layout';
import Form from '@cloudscape-design/components/form';
import { FC, useCallback, useContext, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { IntegrationConfig } from './config';
import { ExtensionConfigContext } from './ExtensionConfigProvider';
import { RegexArrayForm } from './RegexArrayForm';

export interface ConfigDetailViewProps {

}

export const ConfigDetailView: FC<ConfigDetailViewProps> = () => {
  const navigate = useNavigate();
  const { integrationType } = useParams<{ integrationType: string }>();
  const { config, setConfig } = useContext(ExtensionConfigContext);
  const integrationConfig = useMemo(() => config.integrations[integrationType!], [integrationType, config]);
  const setIntegrationConfig = useCallback((newIntegrationConfig: Partial<IntegrationConfig>) => {
    setConfig((prev) => {
      return {
        ...prev,
        integrations: {
          ...prev.integrations,
          [integrationType!]:
            { ...prev.integrations[integrationType!], ...newIntegrationConfig },
        },
      };
    });
  }, [integrationType, setConfig]);
  return (
    <ContentLayout
      header={
        <Box margin={'s'}>
          <Header
            variant="h1"
            description="View Threat Composer exports with a single click"
          >
            Threat Composer extension
          </Header>
        </Box>
      }>
      <Box padding={'m'}>
        <Container>
          <SpaceBetween size="xs">
            <Header variant='h2'>{integrationConfig.name} integration</Header>
            <p>{integrationConfig.name} integration will be <i>attempted</i> for URLs that match
              <strong>any</strong> of the specified regular expressions.</p>
            <Form actions={(
              <SpaceBetween size="xs" direction="horizontal">
                <Button onClick={() => {
                  navigate('/');
                }}>Back</Button>
              </SpaceBetween>
            )}>
              <RegexArrayForm placeholder="Regex to add" strings={integrationConfig.urlRegexes} setStrings={(newRegexes) => { setIntegrationConfig({ urlRegexes: newRegexes }); }}>
              </RegexArrayForm>
            </Form>
          </SpaceBetween>
        </Container>
      </Box>
    </ContentLayout>
  );
};
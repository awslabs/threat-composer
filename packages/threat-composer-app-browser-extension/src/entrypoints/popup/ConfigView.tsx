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
import Link from '@cloudscape-design/components/link';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Toggle from '@cloudscape-design/components/toggle';
import { FC, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DefaultConfig,
  IntegrationTypes,
} from './config';
import { ExtensionConfigContext } from './ExtensionConfigProvider';

interface ConfigProps {
}

const Config: FC<ConfigProps> = ({ }) => {
  const navigate = useNavigate();
  const { config, setConfig } = useContext(ExtensionConfigContext);

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
        <SpaceBetween size="m">
          <Container>
            <SpaceBetween size="xxs">
              <Header variant="h3">'View Raw' file integration</Header>
              <ColumnLayout columns={2}>
                <SpaceBetween size="xxs" direction="horizontal">
                  <Toggle
                    onChange={({ detail }) =>
                      setConfig((prev) => ({
                        ...prev,
                        integrations: {
                          ...prev.integrations,
                          [IntegrationTypes.RAW]: {
                            ...prev.integrations[IntegrationTypes.RAW],
                            enabled: detail.checked,
                          },
                        },
                      }))
                    }
                    checked={config.integrations[IntegrationTypes.RAW].enabled}
                  >
                  Anywhere <small>(*.tc.json)</small>
                  </Toggle>
                  <Button iconName="settings" variant="inline-icon" onClick={() => { navigate(`/integration/${IntegrationTypes.RAW}`); }} />
                </SpaceBetween>
              </ColumnLayout>
            </SpaceBetween>
          </Container>
          <Container>
            <SpaceBetween size="xxs">
              <Header variant="h3">Code browser integrations</Header>
              <SpaceBetween size="xxs" direction="horizontal">
                <Toggle
                  onChange={({ detail }) =>
                    setConfig((prev) => ({
                      ...prev,
                      integrations: {
                        ...prev.integrations,
                        [IntegrationTypes.GITHUB]: {
                          ...prev.integrations[IntegrationTypes.GITHUB],
                          enabled: detail.checked,
                        },
                      },
                    }))
                  }
                  checked={config.integrations[IntegrationTypes.GITHUB].enabled}
                >GitHub
                </Toggle>
                <Button iconName="settings" variant="inline-icon" onClick={() => { navigate(`/integration/${IntegrationTypes.GITHUB}`); }} />
              </SpaceBetween>
              <SpaceBetween size="xxs" direction="horizontal">
                <Toggle
                  onChange={({ detail }) =>
                    setConfig((prev) => ({
                      ...prev,
                      integrations: {
                        ...prev.integrations,
                        [IntegrationTypes.CODEAMAZON]: {
                          ...prev.integrations[IntegrationTypes.CODEAMAZON],
                          enabled: detail.checked,
                        },
                      },
                    }))
                  }
                  checked={config.integrations[IntegrationTypes.CODEAMAZON].enabled}
                >
                  Amazon Code
                </Toggle>
                <Button iconName="settings" variant="inline-icon" onClick={() => { navigate(`/integration/${IntegrationTypes.CODEAMAZON}`); }} />
              </SpaceBetween>
              <SpaceBetween size="xxs" direction="horizontal">
                <Toggle
                  onChange={({ detail }) =>
                    setConfig((prev) => ({
                      ...prev,
                      integrations: {
                        ...prev.integrations,
                        [IntegrationTypes.CODEAMAZON]: {
                          ...prev.integrations[IntegrationTypes.CODEAMAZON],
                          enabled: detail.checked,
                        },
                      },
                    }))
                  }
                  checked={config.integrations[IntegrationTypes.CODECATALYST].enabled}
                >
                Amazon CodeCatalyst
                </Toggle>
                <Button iconName="settings" variant="inline-icon" onClick={() => { navigate(`/integration/${IntegrationTypes.CODECATALYST}`); }} />
              </SpaceBetween>
              <SpaceBetween size="xxs" direction="horizontal">
                <Toggle
                  onChange={({ detail }) =>
                    setConfig((prev) => ({
                      ...prev,
                      integrations: {
                        ...prev.integrations,
                        [IntegrationTypes.BITBUCKET]: {
                          ...prev.integrations[IntegrationTypes.BITBUCKET],
                          enabled: detail.checked,
                        },
                      },
                    }))
                  }
                  checked={config.integrations[IntegrationTypes.BITBUCKET].enabled}
                >Bitbucket
                </Toggle>
                <Button iconName="settings" variant="inline-icon" onClick={() => { navigate(`/integration/${IntegrationTypes.BITBUCKET}`); }} />
              </SpaceBetween>
              <SpaceBetween size="xxs" direction="horizontal">
                <Toggle
                  onChange={({ detail }) =>
                    setConfig((prev) => ({
                      ...prev,
                      integrations: {
                        ...prev.integrations,
                        [IntegrationTypes.GITLAB]: {
                          ...prev.integrations[IntegrationTypes.GITLAB],
                          enabled: detail.checked,
                        },
                      },
                    }))
                  }
                  checked={config.integrations[IntegrationTypes.GITLAB].enabled}
                >GitLab
                </Toggle>
                <Button iconName="settings" variant="inline-icon" onClick={() => { navigate(`/integration/${IntegrationTypes.GITLAB}`); }} />
              </SpaceBetween>

            </SpaceBetween>
          </Container>
          <Container>
            <SpaceBetween size="xxs">
              <Header variant="h3">Debug</Header>
              <Toggle
                onChange={({ detail }) =>
                  setConfig((prev) => ({
                    ...prev,
                    debug: detail.checked,
                  }))
                }
                checked={config.debug}
              >
                Debug mode <small>(output to console)</small>
              </Toggle>
            </SpaceBetween>
          </Container>
          <Box textAlign="center">
            <SpaceBetween size='xs' direction='horizontal' alignItems='center' >
              <Button
                onClick={() => {
                  setConfig(() => DefaultConfig);
                }}
              >
            Restore defaults
              </Button>
              <Link external href="https://github.com/awslabs/threat-composer">GitHub Project</Link>
            </SpaceBetween>
            {/* <p>
              <small>
                <a
                  href="https://github.com/awslabs/threat-composer"
                  target="_blank"
                >
                </a>
              </small>
            </p> */}
          </Box>
        </SpaceBetween>
      </Box>
    </ContentLayout>
  );
};

export default Config;

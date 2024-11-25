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
import Header from '@cloudscape-design/components/header';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Toggle from '@cloudscape-design/components/toggle';
import { FC, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TCConfig,
  useExtensionConfig,
  ThreatComposerTarget,
  DefaultConfig,
  IntegrationTypes,
} from './config';
import { ExtensionConfigContext } from './ExtensionConfigProvider';

interface ConfigProps {
}

// function createTargetOption(target: ThreatComposerTarget) {
//   switch (target) {
//     case ThreatComposerTarget.GITHUB_PAGES:
//       return {
//         value: ThreatComposerTarget.GITHUB_PAGES,
//         label: "GitHub pages hosted version (threat-composer.github.io)",
//       };
//     case ThreatComposerTarget.CUSTOM_HOST:
//       return {
//         value: ThreatComposerTarget.CUSTOM_HOST,
//         label: "Self hosted version",
//       };
//     case ThreatComposerTarget.BUILT_IN:
//     default:
//       return {
//         value: ThreatComposerTarget.BUILT_IN,
//         label: "Built-in, extension hosted version",
//       };
//   }
// }

const Config: FC<ConfigProps> = ({ }) => {
  const navigate = useNavigate();
  const { config, setConfig } = useContext(ExtensionConfigContext);

  return (
    <Box>
      <SpaceBetween size="xs">
        <div>
          <Header variant="h1">Threat Composer extension</Header>
          <small>
            View web accessible Threat Composer exports (.tc.json) with one
            click
          </small>
        </div>
        <Container>
          <SpaceBetween size="xs">
            <div>
              <Header variant="h3">'View Raw' file integration</Header>
            </div>
            <ColumnLayout columns={2}>
              <div>
                <SpaceBetween size="xs" direction="horizontal">
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
              </div>
            </ColumnLayout>
          </SpaceBetween>
        </Container>
        <Container>
          <SpaceBetween size="xs">
            <div>
              <Header variant="h3">Code browser integrations</Header>
            </div>
            <div>
              <SpaceBetween size="xs" direction="horizontal">
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
              <SpaceBetween size="xs" direction="horizontal">
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
              <SpaceBetween size="xs" direction="horizontal">
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
              <SpaceBetween size="xs" direction="horizontal">
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
              <SpaceBetween size="xs" direction="horizontal">
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
            </div>
          </SpaceBetween>
        </Container>
        <Container>
          <SpaceBetween size="xs">
            <div>
              <Header variant="h3">Debug</Header>
            </div>
            <div>
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
            </div>
          </SpaceBetween>
        </Container>
        {/* <Container>
          <SpaceBetween size="xs">
            <div>
              <Header variant="h3">Open with</Header>
            </div>
            <div>
              <Select
                selectedOption={createTargetOption(config.target)}
                options={[
                  ThreatComposerTarget.BUILT_IN,
                  ThreatComposerTarget.GITHUB_PAGES,
                  ThreatComposerTarget.CUSTOM_HOST,
                ].map(createTargetOption)}
                onChange={({ detail }) =>
                  setConfig((prev) => ({
                    ...prev,
                    target: detail.selectedOption.value as ThreatComposerTarget,
                  }))
                }
              />
              {config.target == ThreatComposerTarget.CUSTOM_HOST ? (
                <FormField label="URL of self hosted version">
                  <Input
                    onChange={({ detail }) =>
                      setConfig((prev) => ({
                        ...prev,
                        customUrl: detail.value,
                      }))
                    }
                    value={config.customUrl ?? ""}
                    placeholder="https://"
                  />
                </FormField>
              ) : null}
            </div>
          </SpaceBetween>
        </Container> */}
        <Box textAlign="center">
          <Button
            onClick={() => {
              setConfig(() => DefaultConfig);
            }}
          >
            Restore defaults
          </Button>
          <p>
            <small>
              <a
                href="https://github.com/awslabs/threat-composer"
                target="_blank"
              >
                GitHub Project
              </a>
            </small>
          </p>
        </Box>
      </SpaceBetween>
    </Box>
  );
};

export default Config;

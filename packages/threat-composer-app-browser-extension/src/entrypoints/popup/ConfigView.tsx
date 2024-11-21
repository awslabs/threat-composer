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
import FormField from '@cloudscape-design/components/form-field';
import Header from '@cloudscape-design/components/header';
import Input from '@cloudscape-design/components/input';
import Select from '@cloudscape-design/components/select';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Toggle from '@cloudscape-design/components/toggle';
import { FC } from 'react';
import {
  TCConfig,
  useExtensionConfig,
  ThreatComposerTarget,
  DefaultConfig,
} from './config';

interface ConfigProps {
  readonly initialConfig: TCConfig;
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

const Config: FC<ConfigProps> = ({ initialConfig }) => {
  const [config, setConfig] = useExtensionConfig(initialConfig);

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
                <Toggle
                  onChange={({ detail }) =>
                    setConfig((prev) => ({
                      ...prev,
                      integrationRaw: detail.checked,
                    }))
                  }
                  checked={config.integrationRaw}
                >
                  Anywhere <small>(*.tc.json)</small>
                </Toggle>
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
              <Toggle
                onChange={({ detail }) =>
                  setConfig((prev) => ({
                    ...prev,
                    integrationGitHubCodeBrowser: detail.checked,
                  }))
                }
                checked={config.integrationGitHubCodeBrowser}
              >
                GitHub <small>(github.com/*)</small>
              </Toggle>
              <Toggle
                onChange={({ detail }) =>
                  setConfig((prev) => ({
                    ...prev,
                    integrationAmazonCodeBrowser: detail.checked,
                  }))
                }
                checked={config.integrationAmazonCodeBrowser}
              >
                Amazon Code <small>(code.amazon.com/*</small>)
              </Toggle>
              <Toggle
                onChange={({ detail }) =>
                  setConfig((prev) => ({
                    ...prev,
                    integrationCodeCatalystCodeBrowser: detail.checked,
                  }))
                }
                checked={config.integrationCodeCatalystCodeBrowser}
              >
                Amazon CodeCatalyst <small>(codecatalyst.aws/*</small>)
              </Toggle>
              <Toggle
                onChange={({ detail }) =>
                  setConfig((prev) => ({
                    ...prev,
                    integrationBitBucketCodeBrowser: detail.checked,
                  }))
                }
                checked={config.integrationBitBucketCodeBrowser}
              >
                Bitbucket <small>(bitbucket.org/*</small>)
              </Toggle>
              <Toggle
                onChange={({ detail }) =>
                  setConfig((prev) => ({
                    ...prev,
                    integrationGitLabCodeBrowser: detail.checked,
                  }))
                }
                checked={config.integrationGitLabCodeBrowser}
              >
                GitLab
              </Toggle>
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

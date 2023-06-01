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
import Alert from '@cloudscape-design/components/alert';
import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import Header from '@cloudscape-design/components/header';
import Modal from '@cloudscape-design/components/modal';
import SpaceBetween from '@cloudscape-design/components/space-between';
import React, { FC, useMemo, useState } from 'react';
import { TemplateThreatStatement } from '../../../customTypes';
import renderThreatStatement from '../../../utils/renderThreatStatement';
import Textarea from '../../generic/Textarea';

export interface CustomTemplateProps {
  visible: boolean;
  setVisible: React.Dispatch<React.SetStateAction<boolean>>;
  onConfirm: (template: string) => void;
  statement: TemplateThreatStatement;
  defaultTemplate: string;
}

const CustomTemplate: FC<CustomTemplateProps> = ({ visible, setVisible, statement, defaultTemplate, onConfirm }) => {
  const [value, setValue] = useState(statement?.customTemplate || defaultTemplate);

  const renderedStatement = useMemo(() => {
    const { statement: updatedStatement } = renderThreatStatement({
      ...statement,
      customTemplate: value === defaultTemplate ? undefined : value,
    });
    return updatedStatement;
  }, [statement, value, defaultTemplate]);

  const footer = useMemo(() => {
    return (<Box float="right">
      <SpaceBetween direction="horizontal" size="xs">
        <Button variant="link" onClick={() => setVisible(false)}>Cancel</Button>
        <Button onClick={() => setValue(defaultTemplate)}>Reset to default</Button>
        <Button variant="primary" disabled={value.length < 3} onClick={() => onConfirm(value)}>
          Confirm
        </Button>
      </SpaceBetween>
    </Box>);
  }, [setVisible, onConfirm, value, defaultTemplate]);

  const isUsingDefaultTemplate = value === defaultTemplate;

  return (<Modal
    header={<Header>Custom Template</Header>}
    visible={visible}
    footer={footer}
    onDismiss={() => setVisible(false)}
  >
    <SpaceBetween direction="vertical" size="l">
      <Alert type='info' header={isUsingDefaultTemplate ? 'Default template is used' : 'Custom template is used'}>
        {isUsingDefaultTemplate ?
          'You can create a custom template to control how your statement is renderer. It is only applicable to the currently editing statement.'
          : 'You can edit the custom template or reset it to the default template. It is only applicable to the currently editing statement. '}
      </Alert>
      <Box>
        <p><b>Renderer Statement:</b></p>
        <p>{renderedStatement}</p>
      </Box>
      <Textarea
        value={value}
        onChange={({ detail }) => setValue(detail.value)}
        label="Template"
        constraintText="Tokens like [threat_source], [prerequisites], [threat_action], [threat_impact], [impacted_goal] or [impacted_assets] will be replaced by actual content. "
      />
    </SpaceBetween>
  </Modal>);
};

export default CustomTemplate;
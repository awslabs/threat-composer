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
import {
  TemplateThreatStatement,
  TemplateThreatStatementSchema,
} from '../../../customTypes';
import { useReloadedTranslation } from '../../../i18next';
import renderThreatStatement from '../../../utils/renderThreatStatement';
import LocalizationContainer from '../../generic/LocalizationContainer';
import Textarea from '../../generic/Textarea';

export interface CustomTemplateProps {
  visible: boolean;
  setVisible: React.Dispatch<React.SetStateAction<boolean>>;
  onConfirm: (template: string) => void;
  statement: TemplateThreatStatement;
  defaultTemplate: string;
}

const CustomTemplate: FC<CustomTemplateProps> = ({
  visible,
  setVisible,
  statement,
  defaultTemplate,
  onConfirm,
}) => {
  const [value, setValue] = useState(
    statement?.customTemplate || defaultTemplate,
  );
  const { t, i18n } = useReloadedTranslation();
  const renderedStatement = useMemo(() => {
    const { statement: updatedStatement } = renderThreatStatement(
      {
        ...statement,
        customTemplate: value === defaultTemplate ? undefined : value,
      },
      t,
    );
    return updatedStatement;
  }, [statement, value, defaultTemplate, t, i18n.language]);

  const footer = useMemo(() => {
    return (
      <Box float="right">
        <SpaceBetween direction="horizontal" size="xs">
          <Button variant="link" onClick={() => setVisible(false)}>
            {t('Cancel')}
          </Button>
          <Button onClick={() => setValue(defaultTemplate)}>
            {t('Reset to default')}
          </Button>
          <Button
            variant="primary"
            disabled={value.length < 3}
            onClick={() => onConfirm(value)}
          >
            {t('Confirm')}
          </Button>
        </SpaceBetween>
      </Box>
    );
  }, [setVisible, onConfirm, value, defaultTemplate, t, i18n.language]);

  const isUsingDefaultTemplate = value === defaultTemplate;

  return (
    <Modal
      header={
        <LocalizationContainer i18next={i18n}>
          <Header>{t('Custom Template')}</Header>
        </LocalizationContainer>
      }
      visible={visible}
      footer={footer}
      onDismiss={() => setVisible(false)}
    >
      <LocalizationContainer i18next={i18n}>
        <SpaceBetween direction="vertical" size="l">
          <Alert
            type="info"
            header={t(
              isUsingDefaultTemplate
                ? 'Default template is used'
                : 'Custom template is used',
            )}
          >
            {t(
              isUsingDefaultTemplate
                ? 'You can create a custom template to control how your statement is renderer. It is only applicable to the currently editing statement.'
                : 'You can edit the custom template or reset it to the default template. It is only applicable to the currently editing statement.',
            )}
          </Alert>
          <Box>
            <p>
              <b>{t('Renderer Statement')}:</b>
            </p>
            <p>{renderedStatement}</p>
          </Box>
          <Textarea
            value={value}
            onChange={({ detail }) => setValue(detail.value)}
            label={t('Template')}
            validateData={
              TemplateThreatStatementSchema.shape.customTemplate.safeParse
            }
            constraintText="Tokens like [threat_source], [prerequisites], [threat_action], [threat_impact], [impacted_goal] or [impacted_assets] will be replaced by actual content. "
          />
        </SpaceBetween>
      </LocalizationContainer>
    </Modal>
  );
};

export default CustomTemplate;

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
import Button from '@cloudscape-design/components/button';
import ButtonDropdown, { ButtonDropdownProps } from '@cloudscape-design/components/button-dropdown';
import Container from '@cloudscape-design/components/container';
import Header from '@cloudscape-design/components/header';
import { CancelableEventHandler } from '@cloudscape-design/components/internal/events';
import SpaceBetween from '@cloudscape-design/components/space-between';
import TextContent from '@cloudscape-design/components/text-content';
import a from 'indefinite';
import { ReactNode, FC, useMemo, useState, useEffect, useCallback } from 'react';
import ExpandableToken from './components/ExpandableToken';
import Token from './components/Token';
import { useGlobalSetupContext } from '../../../contexts/GlobalSetupContext/context';
import { ComposerMode, TemplateThreatStatement } from '../../../customTypes';
import { threatFieldTypeMapping, ThreatFieldTypes } from '../../../customTypes/threatFieldTypes';
import threatFieldData from '../../../data/threatFieldData';
import threatStatementFormat from '../../../data/threatStatementFormat';
import getFieldContentByToken from '../../../utils/getFieldContentByToken';
import getRecommendedEditor from '../../../utils/getRecommandedEditor';
import Tooltip from '../../generic/Tooltip';
import Suggestions from '../Suggestions';

import './index.css';

const defaultThreatStatementFormat = threatStatementFormat[63];

export interface FieldSelectorProps {
  composerMode: ComposerMode;
  currentEditor?: ThreatFieldTypes;
  setEditor: (type: ThreatFieldTypes) => void;
  statement: TemplateThreatStatement;
  suggestions?: string[];
  onGiveExampleClick: () => void;
  setCustomTemplateEditorVisible: (visible: boolean) => void;
  onStartOver?: () => void;
}

const FieldSelector: FC<FieldSelectorProps> = ({
  composerMode,
  onStartOver,
  setEditor,
  currentEditor,
  statement,
  suggestions,
  onGiveExampleClick,
  setCustomTemplateEditorVisible,
}) => {
  const [expandedImpactedGoal, setExpandedImpactedGoal] = useState(false);

  useEffect(() => {
    currentEditor === 'impacted_goal' && setExpandedImpactedGoal(true);
  }, [currentEditor]);

  useEffect(() => {
    // Set default to collapse impacted goal when current editing statement change
    setExpandedImpactedGoal(false);
  }, [statement]);

  const { showInfoModal } = useGlobalSetupContext();

  const selector = useMemo(() => {
    const output: ReactNode[] = [];
    let template = statement.customTemplate || defaultThreatStatementFormat.template;
    let renderShortenImpactedGoal = false;
    while (true) {
      const startIndex = template.indexOf('[');
      if (startIndex < 0) {
        break;
      }
      let before = template.slice(0, startIndex);

      const endIndex = template.indexOf(']');
      if (endIndex < 0) {
        break;
      }
      const token = template.slice(startIndex + 1, endIndex) as ThreatFieldTypes;
      const content = getFieldContentByToken(token, statement);

      // For the default template, we can hardcode here.
      if (before === 'A ') {
        before = before.replace('A', a(content, { capitalize: true, articleOnly: true }));
      }

      const value = statement[threatFieldTypeMapping[token]];

      const filled = value && (typeof value === 'string' || (Array.isArray(value) && value.length > 0));

      if (token === 'impacted_goal' && !expandedImpactedGoal && !filled && !statement.customTemplate) {
        // If impacted goal is empty, display shorten message.
        output.push(',');
        output.push(<Tooltip tooltip={<>Expand <br />{threatFieldData[token]?.tooltip}</>} key={`${token}_expand_button`}>
          <ExpandableToken
            expanded={false}
            onClick={() => {
              setExpandedImpactedGoal(true);
              setEditor('impacted_goal');
            }}
          /></Tooltip>);
        renderShortenImpactedGoal = true;
      } else {
        if (renderShortenImpactedGoal) {
          output.push('negatively impacting ');
        } else {
          output.push(before);
        }

        output.push(<Tooltip tooltip={threatFieldData[token]?.tooltip} key={token}><Token
          highlighted={currentEditor === token}
          filled={!!filled}
          onClick={() => setEditor(token as ThreatFieldTypes)}>
          {content}
        </Token></Tooltip>);

        token === 'impacted_goal' &&
          !filled &&
          output.push(<Tooltip tooltip={<>Collapse <br />{threatFieldData[token]?.tooltip}</>} key={`${token}_collapse_button`}>
            <ExpandableToken
              expanded
              onClick={() => {
                setExpandedImpactedGoal(false);
                const nextEditor = getRecommendedEditor(statement);
                nextEditor && setEditor(nextEditor);
              }}
            /></Tooltip>);
      }

      template = template.slice(endIndex + 1);
    }

    return output;
  }, [statement, setEditor, currentEditor, suggestions, expandedImpactedGoal, setExpandedImpactedGoal]);

  const handleMoreActions: CancelableEventHandler<ButtonDropdownProps.ItemClickDetails> = useCallback(({ detail }) => {
    switch (detail.id) {
      case 'customTemplate':
        setCustomTemplateEditorVisible(true);
        break;
      default:
        console.log('Unknown action', detail.id);
    }
  }, [setCustomTemplateEditorVisible]);

  return (<Container
    header={<Header
      info={<Button variant='icon' iconName='status-info' onClick={showInfoModal} />}
      actions={<SpaceBetween direction='horizontal' size='s'>
        {composerMode === 'EditorOnly' && <Button onClick={onStartOver}>Start over</Button>}
        <Button onClick={onGiveExampleClick}>Give me a random example</Button>
        <ButtonDropdown items={[
          { id: 'customTemplate', text: 'Custom Template' },
        ]}
        ariaLabel="More actions"
        variant="icon"
        onItemClick={handleMoreActions} />
      </SpaceBetween>}
      description='Start by clicking ANY field you like and work from there...'>Let's write a threat statement!</Header>}>
    <SpaceBetween direction='vertical' size='s'>
      <TextContent>
        <div className='threat-statement-generator-editor-container-token-selector'>
          {selector}
        </div>
      </TextContent>
      <Suggestions suggestions={suggestions} setEditor={setEditor} />
    </SpaceBetween>
  </Container>);
};

export default FieldSelector;

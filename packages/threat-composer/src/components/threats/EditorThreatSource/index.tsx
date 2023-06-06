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
/** @jsxImportSource @emotion/react */
import Button from '@cloudscape-design/components/button';
import ColumnLayout from '@cloudscape-design/components/column-layout';
import { InputProps } from '@cloudscape-design/components/input';
import TextContent from '@cloudscape-design/components/text-content';
import { FC, useCallback, useEffect, useRef, forwardRef } from 'react';
import { useThreatsContext } from '../../../contexts/ThreatsContext/context';
import Input from '../../generic/Input';
import EditorLayout from '../EditorLayout';
import styles from '../EditorLayout/styles';
import ExampleList from '../ExampleList';
import { EditorProps } from '../ThreatStatementEditor/types';

const EditorThreatSource: FC<EditorProps> = forwardRef<InputProps.Ref, EditorProps>(({
  statement, setStatement, fieldData,
}, ref) => {
  const { perFieldExamples, previousInputs } = useThreatsContext();

  const valueRef = useRef<string | undefined>(statement.threatSource);
  useEffect(() => {
    valueRef.current = statement.threatSource?.trim();
  }, [statement.threatSource]);

  const handleChange = useCallback((threatSource: string) => {
    setStatement(prevStatement => prevStatement && ({
      ...prevStatement,
      threatSource: threatSource,
    }));
  }, [setStatement]);

  return (<EditorLayout
    title={fieldData.displayTitle}
    description={fieldData.description}
  >
    <div css={styles.textEditorLayout}>
      <div css={styles.input}>
        <Input
          ref={ref}
          spellcheck
          onChange={({ detail }) => handleChange(detail.value)}
          value={statement.threatSource || ''}
          placeholder='Enter threat source'
        />
      </div>
      {statement.threatSource && <div css={styles.inputClearSmall}>
        <Button variant='icon' iconName='close' onClick={() => handleChange('')} />
      </div>}
    </div>
    <ColumnLayout columns={previousInputs.threat_source.length > 0 ? 2 : 1}>
      {perFieldExamples.threat_source.length > 0 &&
        <ExampleList examples={perFieldExamples.threat_source} onSelect={handleChange} showSearch={false}></ExampleList>}
      {previousInputs.threat_source.length > 0 && <TextContent>
        <span>From previous input</span>
        <ul>
          {previousInputs.threat_source.map((threatSource, index) => (<li key={index}><Button variant='link' onClick={() => handleChange(threatSource)}>{threatSource}</Button></li>))}
        </ul>
      </TextContent>}
    </ColumnLayout>
  </EditorLayout>);
});

export default EditorThreatSource;

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
import { FC, useCallback, useEffect, useRef, forwardRef } from 'react';
import { useBrainstormContext } from '../../../contexts/BrainstormContext/context';
import { useThreatsContext } from '../../../contexts/ThreatsContext/context';
import { TemplateThreatStatementSchema } from '../../../customTypes';
import Input from '../../generic/Input';
import BrainstormList from '../BrainstormList';
import EditorLayout from '../EditorLayout';
import styles from '../EditorLayout/styles';
import ExampleList from '../ExampleList';
import PreviousInputList from '../PreviousInputList';
import { EditorProps } from '../ThreatStatementEditor/types';

const EditorThreatSource: FC<EditorProps> = forwardRef<InputProps.Ref, EditorProps>(({
  statement, setStatement, fieldData,
}, ref) => {
  const { perFieldExamples, previousInputs } = useThreatsContext();
  const { brainstormData } = useBrainstormContext();

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
          validateData={TemplateThreatStatementSchema.shape.threatSource.safeParse}
          stretch
        />
      </div>
      {statement.threatSource && <div css={styles.inputClearSmall}>
        <Button variant='icon' iconName='close' onClick={() => handleChange('')} />
      </div>}
    </div>
    <ColumnLayout columns={
      (perFieldExamples.threat_source.length > 0 ? 1 : 0) +
      (previousInputs.threat_source.length > 0 ? 1 : 0) +
      (brainstormData.threatSources.length > 0 ? 1 : 0)
    }>
      {perFieldExamples.threat_source.length > 0 &&
        <ExampleList examples={perFieldExamples.threat_source} onSelect={handleChange} showSearch={false}></ExampleList>}
      {previousInputs.threat_source.length > 0 &&
        <PreviousInputList
          items={previousInputs.threat_source}
          onSelect={handleChange}
        />
      }
      {brainstormData.threatSources.length > 0 &&
        <BrainstormList
          items={brainstormData.threatSources}
          onSelect={handleChange}
        />
      }
    </ColumnLayout>
  </EditorLayout>);
});

export default EditorThreatSource;

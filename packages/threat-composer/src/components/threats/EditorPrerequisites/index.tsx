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
import { TextareaProps } from '@cloudscape-design/components/textarea';
import { FC, useCallback, forwardRef, useRef, RefObject, useImperativeHandle } from 'react';
import { useBrainstormContext } from '../../../contexts/BrainstormContext/context';
import { useThreatsContext } from '../../../contexts/ThreatsContext/context';
import { TemplateThreatStatementSchema } from '../../../customTypes';
import Textarea from '../../generic/Textarea';
import BrainstormList from '../BrainstormList';
import EditorLayout from '../EditorLayout';
import styles from '../EditorLayout/styles';
import ExampleList from '../ExampleList';
import PreviousInputList from '../PreviousInputList';
import { EditorProps } from '../ThreatStatementEditor/types';

const EditorPrerequisites: FC<EditorProps> = forwardRef<TextareaProps.Ref, EditorProps>(({
  statement, setStatement, fieldData,
}, ref) => {
  const inputRef = useRef<TextareaProps.Ref>();
  const { perFieldExamples, previousInputs } = useThreatsContext();
  const { brainstormData } = useBrainstormContext();

  useImperativeHandle(ref, () => {
    return {
      focus() {
        inputRef.current?.focus();
      },
    };
  }, []);

  const handleChange = useCallback((prerequisites: string) => {
    setStatement(prevStatement => prevStatement && ({
      ...prevStatement,
      prerequisites: prerequisites,
    }));
  }, [setStatement]);

  const handleSelect = useCallback((prerequisites: string) => {
    handleChange(prerequisites);
    inputRef.current?.focus();
  }, [handleChange]);


  return (<EditorLayout
    title={fieldData.displayTitle}
    description={fieldData.description}
  >
    <div css={styles.textEditorLayout}>
      <div css={styles.input}>
        <Textarea
          ref={inputRef as RefObject<TextareaProps.Ref>}
          onChange={({ detail }) => handleChange(detail.value)}
          value={statement.prerequisites || ''}
          placeholder="Enter prerequisites"
          spellcheck
          singleLine
          validateData={TemplateThreatStatementSchema.shape.prerequisites.safeParse}
          rows={2}
          stretch
        />
      </div>
      {statement.prerequisites && <div css={styles.inputClear}>
        <Button variant='icon' iconName='close' onClick={() => handleChange('')} />
      </div>}
    </div>
    <ColumnLayout columns={
      (perFieldExamples.prerequisites.length > 0 ? 1 : 0) +
      (previousInputs.prerequisites.length > 0 ? 1 : 0) +
      (brainstormData.threatPrerequisites.length > 0 ? 1 : 0)
    }>
      {perFieldExamples.prerequisites.length > 0 &&
        <ExampleList examples={perFieldExamples.prerequisites} onSelect={handleSelect}></ExampleList>}
      {previousInputs.prerequisites.length > 0 &&
        <PreviousInputList
          items={previousInputs.prerequisites}
          onSelect={(content) => handleSelect(content)}
        />
      }
      {brainstormData.threatPrerequisites.length > 0 &&
        <BrainstormList
          items={brainstormData.threatPrerequisites}
          onSelect={handleSelect}
        />
      }
    </ColumnLayout>
  </EditorLayout>);
});

export default EditorPrerequisites;

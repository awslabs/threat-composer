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
import { TextareaProps } from '@cloudscape-design/components/textarea';
import { FC, useCallback, forwardRef, useRef, RefObject, useImperativeHandle } from 'react';
import { useThreatsContext } from '../../../contexts/ThreatsContext/context';
import Textarea from '../../generic/Textarea';
import EditorLayout from '../EditorLayout';
import ExampleList from '../ExampleList';
import { EditorProps } from '../ThreatStatementEditor/types';

const EditorPrerequisites: FC<EditorProps> = forwardRef<TextareaProps.Ref, EditorProps>(({
  statement, setStatement, fieldData,
}, ref) => {
  const inputRef = useRef<TextareaProps.Ref>();
  const { perFieldExamples } = useThreatsContext();

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
    <div className='threat-statement-generator-editor-layout-text-editor-layout'>
      <div className='threat-statement-generator-editor-layout-text-editor-layout-input'>
        <Textarea
          ref={inputRef as RefObject<TextareaProps.Ref>}
          onChange={({ detail }) => handleChange(detail.value)}
          value={statement.prerequisites || ''}
          placeholder="Enter prerequisites"
          spellcheck
          rows={2}
        />
      </div>
      {statement.prerequisites && <div className='threat-statement-generator-editor-layout-text-editor-layout-clear'>
        <Button variant='icon' iconName='close' onClick={() => handleChange('')} />
      </div>}
    </div>
    {perFieldExamples.prerequisites.length > 0 &&
      <ExampleList examples={perFieldExamples.prerequisites} onSelect={handleSelect}></ExampleList>}
  </EditorLayout>);
});

export default EditorPrerequisites;

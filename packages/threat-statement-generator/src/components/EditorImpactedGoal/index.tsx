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
import Autosuggest, { AutosuggestProps } from '@cloudscape-design/components/autosuggest';
import { BaseKeyDetail, CancelableEventHandler, NonCancelableEventHandler } from '@cloudscape-design/components/internal/events';
import TokenGroup, { TokenGroupProps } from '@cloudscape-design/components/token-group';
import { FC, useCallback, useState, forwardRef } from 'react';
import { useThreatsContext } from '../../contexts/ThreatsContext/context';
import EditorLayout from '../EditorLayout';
import ExampleList from '../ExampleList';
import { EditorProps } from '../ThreatStatementEditor/types';

const EditorImpactedGoal: FC<EditorProps> = forwardRef<AutosuggestProps.Ref, EditorProps>(({
  statement,
  setStatement,
  fieldData,
}, _ref) => {
  const [value, setValue] = useState<string>('');
  const { perFieldExamples } = useThreatsContext();

  const handleAddImpactedGoal = useCallback((impactedGoal: string) => {
    setStatement(prevStatement => prevStatement && ({
      ...prevStatement,
      impactedGoal: prevStatement.impactedGoal ?
        (!prevStatement.impactedGoal.includes(impactedGoal) ?
          [...prevStatement.impactedGoal, impactedGoal] :
          [...prevStatement.impactedGoal])
        : [impactedGoal],
    }));
    setValue('');
  }, [setStatement]);

  const handleSelect: NonCancelableEventHandler<AutosuggestProps.SelectDetail> = useCallback(({ detail }) => {
    handleAddImpactedGoal(detail.value.trim());
  }, [handleAddImpactedGoal]);

  const handleRemoveImpactedGoal: NonCancelableEventHandler<TokenGroupProps.DismissDetail> = useCallback(({ detail: { itemIndex } }) => {
    setStatement(prevStatement => prevStatement && ({
      ...prevStatement,
      impactedGoal: prevStatement.impactedGoal ?
        [...prevStatement.impactedGoal?.slice(0, itemIndex),
          ...prevStatement.impactedGoal?.slice(itemIndex + 1)] : [],
    }));
  }, [setStatement]);

  const handleExampleClicked = useCallback((example: string) => {
    const tokens = example.replace('and/or', '').replace('and', '').replace('or', '').split(/[\s,]+/);
    tokens.forEach(token => handleAddImpactedGoal(token));
  }, [handleAddImpactedGoal]);

  const handleKeyDown: CancelableEventHandler<BaseKeyDetail> = useCallback(({ detail }) => {
    if (detail.keyCode === 13) {
      handleAddImpactedGoal?.(value);
      setValue('');
    }
  }, [handleAddImpactedGoal, value]);

  return (<EditorLayout
    title={fieldData.displayTitle}
    description={fieldData.description}
  >
    <Autosuggest
      onChange={({ detail }) => setValue(detail.value)}
      onSelect={handleSelect}
      value={value}
      options={fieldData.tokens?.map(token => ({
        value: token,
      }))}
      enteredTextLabel={enteredValue => `Use: "${enteredValue}"`}
      ariaLabel="Autosuggest for impacted goals"
      placeholder="Select an impacted goal or enter new one"
      empty="No matches found"
      onKeyDown={handleKeyDown}
    />
    <TokenGroup
      onDismiss={handleRemoveImpactedGoal}
      items={statement.impactedGoal?.map(goal => ({
        label: goal,
        dismissLabel: `Remove ${goal}`,
      }))}
    />
    {perFieldExamples.impacted_goal.length > 0 &&
      <ExampleList examples={perFieldExamples.impacted_goal} onSelect={handleExampleClicked} showSearch={false}></ExampleList>}
  </EditorLayout>);
});

export default EditorImpactedGoal;

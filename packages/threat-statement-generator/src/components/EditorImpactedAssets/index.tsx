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

const EditorImpactedAssets: FC<EditorProps> = forwardRef<AutosuggestProps.Ref, EditorProps>(({
  statement, setStatement, fieldData,
}, _ref) => {
  const { perFieldExamples, previousInputs } = useThreatsContext();
  const [value, setValue] = useState<string>('');
  const handleAddAsset = useCallback((asset: string) => {
    setStatement(prevStatement => prevStatement && ({
      ...prevStatement,
      impactedAssets: prevStatement.impactedAssets ?
        (!prevStatement.impactedAssets.includes(asset) ?
          [...prevStatement.impactedAssets, asset] :
          [...prevStatement.impactedAssets])
        : [asset],
    }));
    setValue('');
  }, [setStatement]);

  const handleSelect: NonCancelableEventHandler<AutosuggestProps.SelectDetail> = useCallback(({ detail }) => {
    handleAddAsset(detail.value.trim());
  }, [handleAddAsset]);

  const handleRemoveAsset: NonCancelableEventHandler<TokenGroupProps.DismissDetail> = useCallback(({ detail: { itemIndex } }) => {
    setStatement(prevStatement => prevStatement && ({
      ...prevStatement,
      impactedAssets: prevStatement.impactedAssets ?
        [...prevStatement.impactedAssets?.slice(0, itemIndex),
          ...prevStatement.impactedAssets?.slice(itemIndex + 1)] : [],
    }));
  }, [setStatement]);

  const handleKeyDown: CancelableEventHandler<BaseKeyDetail> = useCallback(({ detail }) => {
    if (detail.keyCode === 13) {
      handleAddAsset?.(value);
      setValue('');
    }
  }, [handleAddAsset, value]);

  return (<EditorLayout
    title={fieldData.displayTitle}
    description={fieldData.description}
  >
    <Autosuggest
      onChange={({ detail }) => setValue(detail.value)}
      onSelect={handleSelect}
      value={value}
      options={previousInputs.impacted_assets.map(asset => ({
        value: asset,
      }))}
      enteredTextLabel={enteredValue => `Use: "${enteredValue}"`}
      ariaLabel="Autosuggest for impacted assets"
      placeholder="Select an existing asset or enter new asset"
      empty="No matches found"
      onKeyDown={handleKeyDown}
    />
    <TokenGroup
      onDismiss={handleRemoveAsset}
      items={statement.impactedAssets?.map(asset => ({
        label: asset,
        dismissLabel: `Remove ${asset}`,
      }))}
    />
    {perFieldExamples.impacted_assets.length > 0 &&
      <ExampleList examples={perFieldExamples.impacted_assets} onSelect={handleAddAsset} showSearch={false}></ExampleList>}
  </EditorLayout>);
});

export default EditorImpactedAssets;

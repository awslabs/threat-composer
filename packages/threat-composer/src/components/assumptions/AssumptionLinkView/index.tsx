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
import Autosuggest from '@cloudscape-design/components/autosuggest';
import ExpandableSection, { ExpandableSectionProps } from '@cloudscape-design/components/expandable-section';
import React, { FC, useMemo } from 'react';
import { Assumption } from '../../../customTypes';
import standardizeNumericId from '../../../utils/standardizeNumericId';
import LinkedEntityItem, { getEntityComments } from '../../generic/LinkedEntityItem';

export interface AssumptionLinkProps {
  variant?: ExpandableSectionProps['variant'];
  linkedAssumptionIds: string[];
  assumptionList: Assumption[];
  onAddAssumptionLink: (assumptionId: string) => void;
  onRemoveAssumptionLink: (assumptionId: string) => void;
  /** When set, the assumption id is a link that opens the assumption in the assumptions view. */
  onViewAssumption?: (assumptionId: string) => void;
}

const AssumptionLinkComponent: FC<AssumptionLinkProps> = ({
  linkedAssumptionIds,
  assumptionList,
  onAddAssumptionLink,
  onRemoveAssumptionLink,
  onViewAssumption,
  variant,
}) => {
  const [searchValue, setSearchValue] = React.useState('');

  const linkedAssumptions = useMemo(() => {
    return assumptionList.filter(al => linkedAssumptionIds.includes(al.id));
  }, [linkedAssumptionIds, assumptionList]);

  const filteredAssumptions = useMemo(() => {
    const assumptions = assumptionList.filter(x => !linkedAssumptionIds.includes(x.id));

    if (!searchValue) {
      return assumptions;
    }

    return assumptions.filter(x => (x.content.toLowerCase().indexOf(searchValue.toLowerCase()) >= 0));
  }, [searchValue, assumptionList, linkedAssumptionIds]);

  return (<ExpandableSection
    variant={variant}
    headingTagOverride={variant === 'container' ? 'h3' : undefined}
    headerText={`Linked assumptions (${linkedAssumptions.length})`}>
    <Autosuggest
      onChange={({ detail }) => setSearchValue(detail.value)}
      value={searchValue}
      options={filteredAssumptions.map(x => ({
        value: x.id,
        label: x.content,
      }))}
      onSelect={({ detail }) => {
        onAddAssumptionLink(detail.value);
        setSearchValue('');
      }}
      filteringType='manual'
      enteredTextLabel={value => `Add new assumption: "${value}"`}
      placeholder="Search assumption"
      empty="No matches found"
    />
    <div>
      {linkedAssumptions.map(x => (<LinkedEntityItem
        key={x.id}
        displayId={`A-${standardizeNumericId(x.numericId)}`}
        content={x.content}
        comments={getEntityComments(x)}
        onNavigate={onViewAssumption && (() => onViewAssumption(x.id))}
        dismissLabel={`Unlink assumption ${x.numericId}`}
        onDismiss={() => onRemoveAssumptionLink(x.id)}
      />))}
    </div>
  </ExpandableSection>);
};

export default AssumptionLinkComponent;
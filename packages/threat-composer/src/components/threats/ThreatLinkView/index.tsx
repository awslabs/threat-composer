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
import ExpandableSection from '@cloudscape-design/components/expandable-section';
import React, { FC, useMemo } from 'react';
import { THREAT_STATUS_COLOR_MAPPING } from '../../../configs/status';
import { TemplateThreatStatement } from '../../../customTypes';
import threatStatus from '../../../data/status/threatStatus.json';
import standardizeNumericId from '../../../utils/standardizeNumericId';
import LinkedEntityItem, { getEntityComments, LinkedEntityStatus } from '../../generic/LinkedEntityItem';

export interface ThreatLinkProps {
  linkedThreatIds: string[];
  threatList: TemplateThreatStatement[];
  onAddThreatLink: (threatId: string) => void;
  onRemoveThreatLink: (threatId: string) => void;
  /** When set, the threat id is a link that opens the threat in the threat editor. */
  onViewThreat?: (threatId: string) => void;
}

const ThreatLinkComponent: FC<ThreatLinkProps> = ({
  linkedThreatIds,
  threatList,
  onAddThreatLink,
  onRemoveThreatLink,
  onViewThreat,
}) => {
  const [searchValue, setSearchValue] = React.useState('');

  const linkedThreats = useMemo(() => {
    return threatList.filter(al => linkedThreatIds.includes(al.id));
  }, [linkedThreatIds, threatList]);

  const filteredThreats = useMemo(() => {
    const threats = threatList.filter(x => !linkedThreatIds.includes(x.id));
    if (!searchValue) {
      return threats;
    }

    return threats.filter(x => x.statement && x.statement.toLowerCase().indexOf(searchValue.toLowerCase()) >= 0);
  }, [searchValue, threatList, linkedThreatIds]);

  return (<ExpandableSection headerText={`Linked threats (${linkedThreats.length})`}>
    <Autosuggest
      onChange={({ detail }) => setSearchValue(detail.value)}
      value={searchValue}
      options={filteredThreats.map(x => ({
        value: x.id,
        label: x.statement,
      }))}
      onSelect={({ detail }) => {
        onAddThreatLink(detail.value);
        setSearchValue('');
      }}
      filteringType='manual'
      enteredTextLabel={value => `Use: "${value}"`}
      placeholder="Search threat"
      empty="No matches found"
    />
    <div>
      {linkedThreats.map(x => (<LinkedEntityItem
        key={x.id}
        displayId={`T-${standardizeNumericId(x.numericId)}`}
        content={x.statement || ''}
        status={<LinkedEntityStatus
          status={x.status}
          options={threatStatus}
          colorMapping={THREAT_STATUS_COLOR_MAPPING}
        />}
        comments={getEntityComments(x)}
        onNavigate={onViewThreat && (() => onViewThreat(x.id))}
        dismissLabel={`Unlink threat ${x.numericId}`}
        onDismiss={() => onRemoveThreatLink(x.id)}
      />))}
    </div>
  </ExpandableSection>);
};

export default ThreatLinkComponent;
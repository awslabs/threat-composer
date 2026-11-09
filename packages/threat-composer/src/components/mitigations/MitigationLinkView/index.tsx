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
import { SpaceBetween } from '@cloudscape-design/components';
import Autosuggest from '@cloudscape-design/components/autosuggest';
import Badge from '@cloudscape-design/components/badge';
import ExpandableSection, { ExpandableSectionProps } from '@cloudscape-design/components/expandable-section';
import React, { FC, PropsWithChildren, useMemo } from 'react';
import { MITIGATION_STATUS_RESOLVED } from '../../../configs';
import { MITIGATION_STATUS_COLOR_MAPPING } from '../../../configs/status';
import { Mitigation } from '../../../customTypes';
import mitigationStatus from '../../../data/status/mitigationStatus.json';
import standardizeNumericId from '../../../utils/standardizeNumericId';
import LinkedEntityItem, { getEntityComments } from '../../generic/LinkedEntityItem';

const STATUS_BY_VALUE = new Map(mitigationStatus.map(s => [s.value, s]));

export interface MitigationLinkProps {
  variant?: ExpandableSectionProps['variant'];
  linkedMitigationIds: string[];
  mitigationList: Mitigation[];
  onAddMitigationLink: (mitigationId: string) => void;
  onRemoveMitigationLink: (mitigationId: string) => void;
  /** When set, the mitigation id is a link that opens the mitigation in the mitigations view. */
  onViewMitigation?: (mitigationId: string) => void;
}

const MitigationLinkComponent: FC<PropsWithChildren<MitigationLinkProps>> = ({
  variant,
  linkedMitigationIds,
  mitigationList,
  onAddMitigationLink,
  onRemoveMitigationLink,
  onViewMitigation,
  children,
}) => {
  const [searchValue, setSearchValue] = React.useState('');

  const linkedMitigations = useMemo(() => {
    return mitigationList.filter(al => linkedMitigationIds.includes(al.id));
  }, [linkedMitigationIds, mitigationList]);

  const resolvedCount = useMemo(
    () => linkedMitigations.filter(x => x.status === MITIGATION_STATUS_RESOLVED).length,
    [linkedMitigations]);

  const filteredMitigations = useMemo(() => {
    const mitigations = mitigationList.filter(x => !linkedMitigationIds.includes(x.id));

    if (!searchValue) {
      return mitigations;
    }

    return mitigations.filter(x => x.content.toLowerCase().indexOf(searchValue.toLowerCase()) >= 0);
  }, [searchValue, mitigationList, linkedMitigationIds]);

  return (<ExpandableSection
    variant={variant}
    headingTagOverride={variant === 'container' ? 'h3' : undefined}
    headerText={`Linked mitigations (${linkedMitigations.length})${linkedMitigations.length ? ` · ${resolvedCount} resolved` : ''}`}>
    <SpaceBetween direction='vertical' size="l">
      <div>
        <Autosuggest
          onChange={({ detail }) => setSearchValue(detail.value)}
          value={searchValue}
          options={filteredMitigations.map(x => ({
            value: x.id,
            label: x.content,
          }))}
          onSelect={({ detail }) => {
            onAddMitigationLink(detail.value);
            setSearchValue('');
          }}
          filteringType='manual'
          enteredTextLabel={value => `Add new mitigation: "${value}"`}
          placeholder="Search mitigation"
          empty="No matches found"
        />
        <div>
          {linkedMitigations.map(x => (<LinkedEntityItem
            key={x.id}
            displayId={`M-${standardizeNumericId(x.numericId)}`}
            content={x.content}
            status={<Badge color={MITIGATION_STATUS_COLOR_MAPPING[x.status || 'NotSet'] || 'grey'}>
              {(x.status && STATUS_BY_VALUE.get(x.status)?.label) || 'Status Not Set'}
            </Badge>}
            comments={getEntityComments(x)}
            onNavigate={onViewMitigation && (() => onViewMitigation(x.id))}
            dismissLabel={`Unlink mitigation ${x.numericId}`}
            onDismiss={() => onRemoveMitigationLink(x.id)}
          />))}
        </div>
      </div>
      {children}
    </SpaceBetween>
  </ExpandableSection>);
};

export default MitigationLinkComponent;
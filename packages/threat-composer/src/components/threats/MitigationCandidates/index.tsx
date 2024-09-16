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
import SpaceBetween from '@cloudscape-design/components/space-between';
import { useMemo, FC, useState, useEffect } from 'react';
import { METADATA_KEY_SOURCE_THREAT_PACK, METADATA_KEY_SOURCE_THREAT_PACK_MITIGATION_CANDIDATE } from '../../../configs';
import { useThreatPacksContext } from '../../../contexts';
import { Mitigation } from '../../../customTypes/mitigations';
import getMetadata from '../../../utils/getMetadata';
import Table, { ColumnDefinition } from '../../generic/Table';

export interface MitigationCandidatesProp {
  threatPackId: string;
  threatPackThreatId: string;
  linkedMitigationIds: string[];
  mitigationList: Mitigation[];
  onAddMitigationsFromMitigationCandidates: (mitigationCandidates: Mitigation[], threatPackId: string) => void;
}

const MitigationCandidates: FC<MitigationCandidatesProp> = ({
  threatPackId,
  threatPackThreatId,
  linkedMitigationIds,
  mitigationList,
  onAddMitigationsFromMitigationCandidates,
}) => {
  const [selectedItems, setSelectedItems] = useState<Mitigation[]>([]);
  const { getMitigationCandidates } = useThreatPacksContext();
  const [mitigations, setMitigations] = useState<Mitigation[]>([]);

  const linkedMitigationsFromThreakpack = useMemo(() => {
    return mitigationList.map(x => {
      if (linkedMitigationIds.includes(x.id)) {
        const metadata = getMetadata(x.metadata);
        if (metadata[METADATA_KEY_SOURCE_THREAT_PACK] == threatPackId) {
          return metadata[METADATA_KEY_SOURCE_THREAT_PACK_MITIGATION_CANDIDATE];
        }
      }

      return undefined;
    }).filter(x => !!x);
  }, [mitigationList, linkedMitigationIds, threatPackId]);

  useEffect(() => {
    const setupMitigations = async () => {
      if (threatPackId && threatPackThreatId) {
        const mitigationCandidates = await getMitigationCandidates(threatPackId, threatPackThreatId);
        setMitigations(mitigationCandidates);
      } else {
        setMitigations([]);
      }
    };

    setupMitigations().catch(err => console.log('Error', err));
  }, [threatPackId, threatPackThreatId, getMitigationCandidates]);

  const items = useMemo(() => {
    return mitigations.map(x => {
      const metadata = getMetadata(x.metadata);
      return {
        ...x,
        comments: metadata.Comments || '',
      };
    });
  }, [mitigations]);

  const colDef: ColumnDefinition<{
    content: string;
    comments: string;
  }>[] = useMemo(() => [
    {
      id: 'content',
      header: 'Mitigation',
      cell: (data) => data.content,
      sortingField: 'content',
    },
    {
      id: 'comments',
      header: 'Comments',
      cell: (data) => data.comments,
      sortingField: 'comments',
    },
  ], []);

  if (items.length === 0) {
    return (<></>);
  }

  return (<Table
    columnDefinitions={colDef}
    actions={<SpaceBetween direction='horizontal' size='s'>
      <Button
        variant='primary'
        disabled={selectedItems.length === 0}
        onClick={() => onAddMitigationsFromMitigationCandidates(selectedItems, threatPackId)}
      >
        Add as mitigations
      </Button>
    </SpaceBetween>}
    header="Mitigation Candidates"
    headerVariant='h3'
    variant='embedded'
    items={items || []}
    selectedItems={selectedItems}
    onSelectionChange={({ detail }) => setSelectedItems([...detail.selectedItems])}
    isItemDisabled={(item) => linkedMitigationsFromThreakpack.includes(item.id)}
  />);
};

export default MitigationCandidates;
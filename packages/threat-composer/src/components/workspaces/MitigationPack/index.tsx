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
import ContentLayout from '@cloudscape-design/components/content-layout';
import Header from '@cloudscape-design/components/header';
import SpaceBetween from '@cloudscape-design/components/space-between';
import { useMemo, FC, useCallback, useState } from 'react';
import GeneralInfo from './components/GeneralInfo';
import { useMitigationPacksContext } from '../../../contexts/MitigationPacksContext';
import { Mitigation } from '../../../customTypes/mitigations';
import getMetadata from '../../../utils/getMetadata';
import Table, { ColumnDefinition } from '../../generic/Table';

export interface MitigationPackProp {
  mitigationPackId: string;
}

const MitigationPack: FC<MitigationPackProp> = ({
  mitigationPackId,
}) => {
  const { mitigationPacks, mitigationPackUsage, addMitigations } = useMitigationPacksContext();

  const mitigationPack = useMemo(() => {
    return mitigationPacks.find(x => x.id === mitigationPackId);
  }, []);

  const [selectedItems, setSelectedItems] = useState<Mitigation[]>([]);

  const handleAddToWorkspace = useCallback(async () => {
    await addMitigations(mitigationPackId, selectedItems);
    setSelectedItems([]);
  }, [mitigationPackId, selectedItems]);

  const colDef: ColumnDefinition<Mitigation>[] = useMemo(() => [
    {
      id: 'content',
      header: 'Mitigation',
      cell: (data) => data.content,
      sortingField: 'content',
    },
    {
      id: 'description',
      header: 'Description',
      cell: (data) => {
        const metadata = getMetadata(data.metadata);
        return metadata.Description || '';
      },
      sortingField: 'content',
    },
  ], []);

  const actions = useMemo(() => {
    return (<SpaceBetween direction='horizontal' size='s'>
      <Button variant='primary'
        onClick={handleAddToWorkspace}
        disabled={selectedItems.length === 0
          || selectedItems.every(i => !!mitigationPackUsage[i.id])
        }>
        Add to workspace
      </Button>
    </SpaceBetween>);
  }, [handleAddToWorkspace, selectedItems, mitigationPackUsage]);

  const isItemDisabled = useCallback((item: Mitigation) => {
    return !!mitigationPackUsage?.[mitigationPackId]?.[item.id];
  }, [mitigationPackId, mitigationPackUsage]);

  const totalSelectedItems = useMemo(() => {
    if (mitigationPack) {
      const usedMitigationPackMitigationIds = mitigationPackId && mitigationPackUsage[mitigationPackId]
        ? Object.keys(mitigationPackUsage[mitigationPackId])
        : [];
      const currentSelectedItems = (mitigationPack.mitigations || []).filter(t => usedMitigationPackMitigationIds.includes(t.id)) || [];
      return [...currentSelectedItems, ...selectedItems.filter(si => !currentSelectedItems.some(csi => csi.id === si.id))];
    }

    return [];
  }, [mitigationPack, mitigationPackUsage, selectedItems]);

  if (!mitigationPack) {
    return null;
  }

  return (<ContentLayout header={
    <Header
      variant="h2"
    >
      Mitigation Pack - {mitigationPack.name}
    </Header>
  }><SpaceBetween direction='vertical' size='s'>
      <GeneralInfo mitigationPack={mitigationPack} />
      <Table
        columnDefinitions={colDef}
        actions={actions}
        header="Mitigations"
        items={mitigationPack.mitigations || []}
        wrapLines={true}
        isItemDisabled={isItemDisabled}
        selectedItems={totalSelectedItems}
        onSelectionChange={({ detail }) => setSelectedItems([...detail.selectedItems])}
      /></SpaceBetween></ContentLayout>);
};

export default MitigationPack;
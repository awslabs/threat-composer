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
import { TemplateThreatStatement } from '@aws/threat-composer-core';
import Button from '@cloudscape-design/components/button';
import ContentLayout from '@cloudscape-design/components/content-layout';
import Header from '@cloudscape-design/components/header';
import SpaceBetween from '@cloudscape-design/components/space-between';
import TextContent from '@cloudscape-design/components/text-content';
import { useMemo, FC, useCallback, useState } from 'react';
import GeneralInfo from './components/GeneralInfo';
import { useThreatPacksContext } from '../../../contexts/ThreatPacksContext';
import Table, { ColumnDefinition } from '../../generic/Table';

export interface ThreatPackProp {
  threatPackId: string;
  onEditThreat?: (threatPackId: string, threat: TemplateThreatStatement) => void;
}

const ThreatPack: FC<ThreatPackProp> = ({
  threatPackId,
  onEditThreat,
}) => {
  const { threatPacks, threatPackUsage, addThreats } = useThreatPacksContext();

  const threatPack = useMemo(() => {
    return threatPacks.find(x => x.id === threatPackId);
  }, []);

  const [selectedItems, setSelectedItems] = useState<TemplateThreatStatement[]>([]);

  const totalSelectedItems = useMemo(() => {
    // Merge the threatPackUsage and current selectedItems
    if (threatPack) {
      const usedThreatPackThreatIds = threatPackId && threatPackUsage[threatPackId] ? Object.keys(threatPackUsage[threatPackId]) : [];
      const currentSelectedItems = (threatPack.threats || []).filter(t => usedThreatPackThreatIds.includes(t.id)) || [];
      return [...currentSelectedItems, ...selectedItems.filter(si => !currentSelectedItems.some(csi => csi.id === si.id))];
    }

    return [];
  }, [threatPack, threatPackUsage, selectedItems]);

  const handleAddToWorkspace = useCallback(async () => {
    await addThreats(threatPackId, selectedItems);
    setSelectedItems([]);
  }, [threatPackId, selectedItems]);

  const colDef: ColumnDefinition<TemplateThreatStatement>[] = useMemo(() => [
    {
      id: 'statement',
      header: 'Threat',
      cell: (data) => data.statement,
      sortingField: 'statement',
      minWidth: 500,
    },
    {
      id: 'threatSource',
      header: 'Threat source',
      cell: (data) => data.threatSource,
      sortingField: 'threatSource',
    },
    {
      id: 'prerequisites',
      header: 'Prerequisites',
      cell: (data) => data.prerequisites,
      sortingField: 'prerequisites',
    },
    {
      id: 'threatImpact',
      header: 'Threat impact',
      cell: (data) => data.threatImpact,
      sortingField: 'threatImpact',
    },
    {
      id: 'threatAction',
      header: 'Threat action',
      cell: (data) => data.threatAction,
      sortingField: 'threatAction',
    },
    {
      id: 'impactedGoal',
      header: 'Impacted goal',
      cell: (data) => (<TextContent>
        <ul>{data.impactedGoal?.map((x, index) => <li key={index}>{x}</li>)}</ul>
      </TextContent>),
      sortingField: 'impactedGoal',
    },
    {
      id: 'impactedAssets',
      header: 'Impacted assets',
      cell: (data) => (<TextContent>
        <ul>{data.impactedAssets?.map((x, index) => <li key={index}>{x}</li>)}</ul>
      </TextContent>),
      sortingField: 'impactedAssets',
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (data) => (
        <Button
          variant="inline-link"
          onClick={() => onEditThreat?.(threatPackId, data)}
        >
          Open in editor
        </Button>
      ),
      minWidth: 170,
    },
  ], [threatPackId]);

  const actions = useMemo(() => {
    return (<SpaceBetween direction='horizontal' size='s'>
      <Button variant='primary'
        onClick={handleAddToWorkspace}
        disabled={selectedItems.length === 0
          || selectedItems.every(i => !!threatPackUsage[i.id])
        }>
        Add to workspace
      </Button>
    </SpaceBetween>);
  }, [handleAddToWorkspace, selectedItems, threatPackUsage]);

  const isItemDisabled = useCallback((item: TemplateThreatStatement) => {
    return !!threatPackUsage?.[threatPackId]?.[item.id];
  }, [threatPackId, threatPackUsage]);

  if (!threatPack) {
    return null;
  }

  return (<ContentLayout
    header={
      <Header
        variant="h2"
      >
        Threat Pack - {threatPack.name}
      </Header>
    }
  >
    <SpaceBetween direction='vertical' size='s'>
      <GeneralInfo threatPack={threatPack} />
      <Table
        columnDefinitions={colDef}
        actions={actions}
        header="Threats"
        items={threatPack.threats || []}
        isItemDisabled={isItemDisabled}
        selectedItems={totalSelectedItems}
        onSelectionChange={({ detail }) => setSelectedItems([...detail.selectedItems])}
        resizableColumns
        stickyColumns={{
          first: 1,
        }}
      /></SpaceBetween>
  </ContentLayout>);
};

export default ThreatPack;
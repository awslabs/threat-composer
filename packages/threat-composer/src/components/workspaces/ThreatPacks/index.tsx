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
import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import ContentLayout from '@cloudscape-design/components/content-layout';
import Header from '@cloudscape-design/components/header';
import SpaceBetween from '@cloudscape-design/components/space-between';
import { FC, useMemo } from 'react';
import { useThreatPacksContext } from '../../../contexts/ThreatPacksContext';
import { ThreatPack } from '../../../customTypes/referencePacks';
import Table, { ColumnDefinition } from '../../generic/Table';

export interface ThreatPacksProps {
  onThreatPackLinkClicked?: (id: string) => void;
}

const ThreatPacks: FC<ThreatPacksProps> = ({
  onThreatPackLinkClicked,
}) => {
  const { threatPackUsage, threatPacks } = useThreatPacksContext();

  const colDef: ColumnDefinition<ThreatPack>[] = useMemo(() => [
    {
      id: 'id',
      minWidth: 150,
      header: 'Id',
      cell: (data) => <Button variant="inline-link" onClick={() => onThreatPackLinkClicked?.(data.id)}>{data.id}</Button>,
      sortingField: 'id',
      isRowHeader: true,
    },
    {
      id: 'name',
      minWidth: 120,
      header: 'Name',
      cell: (data) => data.name,
      sortingField: 'name',
    },
    {
      id: 'description',
      minWidth: 200,
      header: 'Description',
      cell: (data) => <Box>{data.description}</Box>,
      sortingField: 'description',
    },
    {
      id: 'countThreats',
      header: 'Total threats',
      cell: (data) => data.threats?.length,
    },
    {
      id: 'countReferencedThreats',
      header: 'Referenced threats',
      cell: (data) => (threatPackUsage[data.id] && Object.keys(threatPackUsage[data.id]).length) || 0,
    },
  ], [threatPackUsage, onThreatPackLinkClicked]);

  return (<ContentLayout
    headerVariant="high-contrast"
    header={<Header
      variant="h2"
      description="Allow you to quickly find and add bulk or selected threat statements to your current workspace"
      counter={`(${threatPacks.length})`}
    >
      Threat Packs
    </Header>
    }>
    <SpaceBetween direction='vertical' size='s'>
      <Table
        columnDefinitions={colDef}
        items={threatPacks}
        disableRowSelect={true}
      /></SpaceBetween>
  </ContentLayout>);
};

export default ThreatPacks;
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
import { useMitigationPacksContext } from '../../../contexts/MitigationPacksContext';
import { MitigationPack } from '../../../customTypes/referencePacks';
import Table, { ColumnDefinition } from '../../generic/Table';


export interface MitigationPacksProps {
  onMitigationPackLinkClicked?: (id: string) => void;
}

const MitigationPacks: FC<MitigationPacksProps> = ({
  onMitigationPackLinkClicked,
}) => {
  const { mitigationPackUsage, mitigationPacks } = useMitigationPacksContext();

  const colDef: ColumnDefinition<MitigationPack>[] = useMemo(() => [
    {
      id: 'id',
      minWidth: 150,
      header: 'Id',
      cell: (data) => (<Button variant="inline-link" onClick={() => onMitigationPackLinkClicked?.(data.id)}>
        {data.id}
      </Button>),
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
      id: 'countMitigations',
      header: 'Total mitigations',
      cell: (data) => data.mitigations?.length,
    },
    {
      id: 'countReferencedMitigations',
      header: 'Referenced mitigations',
      cell: (data) => (mitigationPackUsage[data.id] && Object.keys(mitigationPackUsage[data.id]).length) || 0,
    },
  ], [mitigationPackUsage, onMitigationPackLinkClicked]);

  return (<ContentLayout header={<Header
    variant="h2"
    description="Allow you to quickly find and add bulk or selected mitigation candidates to your current workspace"
    counter={`(${mitigationPacks.length})`}
  >
    Mitigation Packs
  </Header>}>
    <SpaceBetween direction='vertical' size='s'>
      <Table
        columnDefinitions={colDef}
        items={mitigationPacks}
        disableRowSelect={true}
      /></SpaceBetween>
  </ContentLayout>);
};

export default MitigationPacks;
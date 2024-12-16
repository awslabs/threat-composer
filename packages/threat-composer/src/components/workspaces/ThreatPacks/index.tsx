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
import { useReloadedTranslation } from '../../../i18next';
import AutoDirectionContainer from '../../generic/AutoDirectionContainer';
import LocalizationContainer from '../../generic/LocalizationContainer';
import Table, { ColumnDefinition } from '../../generic/Table';


export interface ThreatPacksProps {
  onThreatPackLinkClicked?: (id: string) => void;
}

const ThreatPacks: FC<ThreatPacksProps> = ({
  onThreatPackLinkClicked,
}) => {
  const { threatPackUsage, threatPacks } = useThreatPacksContext();
  const { t, i18n } = useReloadedTranslation();

  const colDef: ColumnDefinition<ThreatPack>[] = useMemo(() => [
    {
      id: 'id',
      minWidth: 150,
      header: t('Id'),
      cell: (data) => <AutoDirectionContainer value={data.id}><Button variant="inline-link" onClick={() => onThreatPackLinkClicked?.(data.id)}>{data.id}</Button></AutoDirectionContainer>,
      sortingField: 'id',
      isRowHeader: true,
    },
    {
      id: 'name',
      minWidth: 120,
      header: t('Name'),
      cell: (data) => <AutoDirectionContainer value={data.name}>{data.name}</AutoDirectionContainer>,
      sortingField: 'name',
    },
    {
      id: 'description',
      minWidth: 200,
      header: t('Description'),
      cell: (data) => <AutoDirectionContainer value={data.description}><Box>{data.description}</Box></AutoDirectionContainer>,
      sortingField: 'description',
    },
    {
      id: 'countThreats',
      header: t('Total threats'),
      cell: (data) => data.threats?.length,
    },
    {
      id: 'countReferencedThreats',
      header: t('Referenced threats'),
      cell: (data) => (threatPackUsage[data.id] && Object.keys(threatPackUsage[data.id]).length) || 0,
    },
  ], [threatPackUsage, onThreatPackLinkClicked]);

  return (<LocalizationContainer i18next={i18n}><ContentLayout
    header={<Header
      variant="h2"
      description={t('Allow you to quickly find and add bulk or selected threat statements to your current workspace')}
      counter={`(${threatPacks.length})`}
    >
      {t('Threat Packs')}
    </Header>
    }>
    <SpaceBetween direction='vertical' size='s'>
      <Table
        columnDefinitions={colDef}
        items={threatPacks}
        disableRowSelect={true}
      /></SpaceBetween>
  </ContentLayout>
  </LocalizationContainer>);
};

export default ThreatPacks;
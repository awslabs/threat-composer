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
import { BrainstormData } from '../../../../../customTypes/brainstorm';

export interface ColumnConfig {
  id: keyof BrainstormData;
  title: string;
  defaultVisible: boolean;
  description: string;
  icon: string;
  isPromotable?: boolean;
  canCreateThreat?: boolean;
  isThreatInput?: boolean;
}

export const columnConfig: ColumnConfig[] = [
  {
    id: 'assumptions',
    title: 'Assumptions',
    defaultVisible: true,
    description: 'Design or security assumptions that may impact threat analysis',
    icon: 'status-info',
    isPromotable: true,
    canCreateThreat: false,
    isThreatInput: false,
  },
  {
    id: 'threatSources',
    title: 'Threat Sources',
    defaultVisible: true,
    description: 'Actors or entities that could pose security threats',
    icon: 'user-profile',
    isPromotable: false,
    canCreateThreat: true,
    isThreatInput: true,
  },
  {
    id: 'threatPrerequisites',
    title: 'Prerequisites',
    defaultVisible: true,
    description: 'Conditions required for a threat to be viable',
    icon: 'settings',
    isPromotable: false,
    canCreateThreat: true,
    isThreatInput: true,
  },
  {
    id: 'threatActions',
    title: 'Threat Actions',
    defaultVisible: true,
    description: 'Activities performed by threat sources to exploit vulnerabilities',
    icon: 'arrow-right',
    isPromotable: false,
    canCreateThreat: true,
    isThreatInput: true,
  },
  {
    id: 'threatImpacts',
    title: 'Threat Impacts',
    defaultVisible: true,
    description: 'Immediate consequences if threat actions succeed',
    icon: 'status-negative',
    isPromotable: false,
    canCreateThreat: true,
    isThreatInput: true,
  },
  {
    id: 'assets',
    title: 'Assets',
    defaultVisible: true,
    description: 'Valuable resources that require protection',
    icon: 'folder',
    isPromotable: false,
    canCreateThreat: true,
    isThreatInput: true,
  },
  {
    id: 'mitigations',
    title: 'Mitigations',
    defaultVisible: true,
    description: 'Measures to reduce threat likelihood or impact',
    icon: 'status-positive',
    isPromotable: true,
    canCreateThreat: false,
    isThreatInput: false,
  },
];

// Helper functions for working with column configuration
export const getThreatInputColumns = (): ColumnConfig[] => {
  return columnConfig.filter(col => col.isThreatInput);
};

export const getPromotableColumns = (): ColumnConfig[] => {
  return columnConfig.filter(col => col.isPromotable);
};

export const getThreatCreationColumns = (): ColumnConfig[] => {
  return columnConfig.filter(col => col.canCreateThreat);
};

export const getColumnById = (id: keyof BrainstormData): ColumnConfig | undefined => {
  return columnConfig.find(col => col.id === id);
};
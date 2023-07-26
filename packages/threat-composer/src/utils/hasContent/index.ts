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
import { ApplicationInfo, ArchitectureInfo, Assumption, DataflowInfo, Mitigation, TemplateThreatStatement } from '../../customTypes';

export const hasApplicationInfo = (applicationInfo: ApplicationInfo) => {
  return !!(applicationInfo.name || applicationInfo.description);
};

export const hasArchitectureInfo = (archInfo: ArchitectureInfo) => {
  return !!(archInfo.description || archInfo.image);
};

export const hasDataflowInfo = (dataflowInfo: DataflowInfo) => {
  return !!(dataflowInfo.description || dataflowInfo.image);
};

export const hasAssumptions = (assumptions: Assumption[]) => {
  return assumptions.length > 0;
};

export const hasThreats = (threatStatementList: TemplateThreatStatement[]) => {
  return threatStatementList.length > 0;
};

export const hasMitigations = (mitigations: Mitigation[]) => {
  return mitigations.length > 0;
};


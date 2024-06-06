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
export const ROUTE_WORKSPACE_PATH = 'workspaces/:workspaceId';
export const ROUTE_WORKSPACE_HOME_PATH = 'dashboard';
export const ROUTE_WORKSPACE_HOME = `${ROUTE_WORKSPACE_PATH}/${ROUTE_WORKSPACE_HOME_PATH}`;
export const ROUTE_THREAT_LIST_PATH = 'threats';
export const ROUTE_THREAT_LIST = `${ROUTE_WORKSPACE_PATH}/${ROUTE_THREAT_LIST_PATH}`;
export const ROUTE_THREAT_EDITOR_PATH = 'threats/:threatId';
export const ROUTE_THREAT_EDITOR = `${ROUTE_WORKSPACE_PATH}/${ROUTE_THREAT_EDITOR_PATH}`;
export const ROUTE_MITIGATION_LIST_PATH = 'mitigations';
export const ROUTE_MITIGATION_LIST = `${ROUTE_WORKSPACE_PATH}/${ROUTE_MITIGATION_LIST_PATH}`;
export const ROUTE_ASSUMPTION_LIST_PATH = 'assumptions';
export const ROUTE_ASSUMPTION_LIST = `${ROUTE_WORKSPACE_PATH}/${ROUTE_ASSUMPTION_LIST_PATH}`;
export const ROUTE_APPLICATION_INFO_PATH = 'application';
export const ROUTE_APPLICATION_INFO = `${ROUTE_WORKSPACE_PATH}/${ROUTE_APPLICATION_INFO_PATH}`;
export const ROUTE_ARCHITECTURE_INFO_PATH = 'architecture';
export const ROUTE_ARCHITECTURE_INFO = `${ROUTE_WORKSPACE_PATH}/${ROUTE_ARCHITECTURE_INFO_PATH}`;
export const ROUTE_DATAFLOW_INFO_PATH = 'dataflow';
export const ROUTE_DATAFLOW_INFO = `${ROUTE_WORKSPACE_PATH}/${ROUTE_DATAFLOW_INFO_PATH}`;
export const ROUTE_VIEW_THREAT_MODEL_PATH = 'threatModel';
export const ROUTE_VIEW_THREAT_MODEL = `${ROUTE_WORKSPACE_PATH}/${ROUTE_VIEW_THREAT_MODEL_PATH}`;
export const ROUTE_THREAT_PACKS_PATH = 'threatPacks';
export const ROUTE_THREAT_PACKS = `${ROUTE_WORKSPACE_PATH}/${ROUTE_THREAT_PACKS_PATH}`;
export const ROUTE_THREAT_PACK_PATH = 'threatPacks/:threatPackId';
export const ROUTE_THREAT_PACK = `${ROUTE_WORKSPACE_PATH}/${ROUTE_THREAT_PACK_PATH}`;
export const ROUTE_THREAT_PACK_THREAT_PATH = 'threatPacks/:threatPackId/:threatId';
export const ROUTE_THREAT_PACK_THREAT = `${ROUTE_WORKSPACE_PATH}/${ROUTE_THREAT_PACK_THREAT_PATH}`;
export const ROUTE_MITIGATION_PACKS_PATH = 'mitigationPacks';
export const ROUTE_MITIGATION_PACKS = `${ROUTE_WORKSPACE_PATH}/${ROUTE_MITIGATION_PACKS_PATH}`;
export const ROUTE_MITIGATION_PACK_PATH = 'mitigationPacks/:mitigationPackId';
export const ROUTE_MITIGATION_PACK = `${ROUTE_WORKSPACE_PATH}/${ROUTE_MITIGATION_PACK_PATH}`;
export const ROUTE_PREVIEW = 'preview/:dataKey';
export const ROUTE_WORKSPACE_DEFAULT = 'workspaces/default';

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
import { ApplicationInfo } from './application';
import { ArchitectureInfo } from './architecture';
import { Assumption, AssumptionLink } from './assumptions';
import { DataflowInfo } from './dataflow';
import { Mitigation, MitigationLink } from './mitigations';
import { TemplateThreatStatement } from './threats';
import { Workspace } from './workspaces';

export interface DataExchangeFormat {
  schema: number;
  workspace?: Workspace;
  applicationInfo?: ApplicationInfo;
  architecture?: ArchitectureInfo;
  dataflow?: DataflowInfo;
  assumptions?: Assumption[];
  mitigations?: Mitigation[];
  assumptionLinks?: AssumptionLink[];
  mitigationLinks?: MitigationLink[];
  threats?: TemplateThreatStatement[];
}
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
import { z } from 'zod';
import { ApplicationInfoSchema } from './application';
import { ArchitectureInfoSchema } from './architecture';
import { AssumptionSchema, AssumptionLinkSchema } from './assumptions';
import { DataflowInfoSchema } from './dataflow';
import { MitigationSchema, MitigationLinkSchema } from './mitigations';
import { TemplateThreatStatementSchema } from './threats';
import { WorkspaceSchema } from './workspaces';

export const DataExchangeFormatSchema = z.object({
  schema: z.number(),
  workspace: WorkspaceSchema.optional(),
  applicationInfo: ApplicationInfoSchema.optional(),
  architecture: ArchitectureInfoSchema.optional(),
  dataflow: DataflowInfoSchema.optional(),
  assumptions: AssumptionSchema.array().optional(),
  mitigations: MitigationSchema.array().optional(),
  assumptionLinks: AssumptionLinkSchema.array().optional(),
  mitigationLinks: MitigationLinkSchema.array().optional(),
  threats: TemplateThreatStatementSchema.array().optional(),
}).strict();

export type DataExchangeFormat = z.infer<typeof DataExchangeFormatSchema>;
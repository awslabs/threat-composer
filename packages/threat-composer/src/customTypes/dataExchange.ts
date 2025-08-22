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
import { BrainstormDataSchema } from './brainstorm';
import { DataflowInfoSchema } from './dataflow';
import { MitigationSchema, MitigationLinkSchema } from './mitigations';
import { TemplateThreatStatementSchema } from './threats';
import { WorkspaceSchema, Workspace } from './workspaces';
import { EventHandler } from '../utils/EventController';

export const DataExchangeFormatSchema = z.object({
  schema: z.number().max(1).describe('Schema version identifier'),
  workspace: WorkspaceSchema.optional().meta({ internal: true }).describe('Workspace configuration and metadata. Reserved for backwards compatibility.'),
  applicationInfo: ApplicationInfoSchema.optional().describe('Information about the application being threat modeled'),
  architecture: ArchitectureInfoSchema.optional().describe('System architecture information about the application being threat modeled'),
  dataflow: DataflowInfoSchema.optional().describe('Data flow information about the application being threat modeled'),
  assumptions: AssumptionSchema.array().optional().describe('Assumptions about the design, threats and migations of the application being threat modeled'),
  mitigations: MitigationSchema.array().optional().describe('Mitigations for the application being threat modeled'),
  assumptionLinks: AssumptionLinkSchema.array().optional().describe('Links between assumptions and threats/mitigations'),
  mitigationLinks: MitigationLinkSchema.array().optional().describe('Links between mitigations and threats'),
  threats: TemplateThreatStatementSchema.array().optional().describe('Threats for the application being threat modeled'),
  brainstormData: BrainstormDataSchema.optional().describe('Brainstorm data for this threat model. Including: assumptions, mitigitations, threat sources, threat prerequisites, threat actions, threat impacts, impacted goals, and impacted assets'),
}).strict().describe('Threat Composer data exchange format schema for importing/exporting threat modeling data. This schema defines the complete structure for threat modeling sessions including application info, architecture diagrams, data flows, threats, mitigations, and assumptions. Files conforming to this schema should use the .tc.json file extension and can be imported/exported through the Threat Composer application. When generating or validating threat model data, ensure all optional fields are included when available (and additive) to provide comprehensive threat modeling coverage. For more information about Threat Composer and threat modeling best practices, visit: https://github.com/awslabs/threat-composer');

export type DataExchangeFormat = z.infer<typeof DataExchangeFormatSchema>;

export const WorkspaceExampleSchema = z.object({
  name: z.string(),
  value: DataExchangeFormatSchema,
});

export const WorkspaceExampleWithIdSchema = WorkspaceExampleSchema.extend({
  id: z.string(),
});

export type WorkspaceExample = z.infer<typeof WorkspaceExampleSchema>;

export type WorkspaceExampleWithId = z.infer<typeof WorkspaceExampleWithIdSchema>;

export interface HasContentDetails {
  applicationName: boolean;
  applicationInfo: boolean;
  architecture: boolean;
  dataflow: boolean;
  assumptions: boolean;
  mitigations: boolean;
  threats: boolean;
}

export interface ThreatComposerNamespace {
  getWorkspaceList?: () => Workspace[];
  getCurrentWorkspaceMetadata?: () => Workspace | null;
  getCurrentWorkspaceData?: () => DataExchangeFormat;
  getCurrentWorkspaceDataMarkdown?: () => Promise<string>;
  stringifyWorkspaceData: (arg0: any) => string;
  setCurrentWorkspaceData?: (arg0: DataExchangeFormat) => Promise<void>;
  switchWorkspace?: (id: string | null) => void;
  createWorkspace?: (workspaceName: string,
    storageType?: Workspace['storageType'],
    metadata?: Workspace['metadata']) => Promise<Workspace>;
  deleteWorkspace?: (id: string) => Promise<void>;
  renameWorkspace?: (id: string, newWorkspaceName: string) => Promise<void>;
  dispatchEvent: (event: CustomEvent) => void;
  addEventListener: (eventName: string, eventHandler: EventHandler) => void;
  applyDensity?: (density?: string) => void;
  applyTheme?: (theme?: string) => void;
}

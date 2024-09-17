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
import { MitigationSchema, MitigationLinkSchema } from './mitigations';
import { TemplateThreatStatementSchema } from './threats';

export const ReferencePackBaseSchema = z.object({
  id: z.string().length(36),
  name: z.string(),
  description: z.string(),
});

export const ThreatPackSchema = ReferencePackBaseSchema.extend({
  threats: TemplateThreatStatementSchema.array().optional(),
  mitigationLinks: MitigationLinkSchema.array().optional(),
  mitigations: MitigationSchema.array().optional(),
});

export type ThreatPack = z.infer<typeof ThreatPackSchema>;

export interface ThreatPackUsage {
  [threatPackId: string]: {
    [threatPackThreatId: string]: string[];
  };
};

export const MitigationPackSchema = ReferencePackBaseSchema.extend({
  mitigations: MitigationSchema.array().optional(),
});

export type MitigationPack = z.infer<typeof MitigationPackSchema>;

export interface MitigationPackUsage {
  [mitigationPackId: string]: {
    [mitigationPackMitigationId: string]: string[];
  };
};
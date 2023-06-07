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
import { ContentEntityBaseSchema, EntityLinkBaseSchema } from './entities';

export const MitigationSchema = ContentEntityBaseSchema.extend({}).strict();;

export type Mitigation = z.infer<typeof MitigationSchema>;

export const MitigationLinkSchema = EntityLinkBaseSchema.extend({
  /**
   * The mitigation being linked.
   */
  mitigationId: z.string().length(36),
  /**
   * The linked entity Id.
   */
  linkedId: z.string().length(36),
}).strict();;

export type MitigationLink = z.infer<typeof MitigationLinkSchema>;

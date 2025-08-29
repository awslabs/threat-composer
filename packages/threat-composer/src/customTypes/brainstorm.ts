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
import { SINGLE_FIELD_INPUT_MAX_LENGTH, SINGLE_FIELD_INPUT_SMALL_MAX_LENGTH } from '../configs';

// Factory function to create context-specific brainstorm item schemas
const createBrainstormItemSchema = (contentDescription: string) => z.object({
  id: z.string().max(36)
    .describe('UUID v4 identifier'),
  content: z.string().max(SINGLE_FIELD_INPUT_MAX_LENGTH)
    .describe(contentDescription),
  createdAt: z.string().datetime()
    .describe('ISO 8601 UTC timestamp when the item was created (e.g., "2024-01-15T14:30:45.123Z")'),
  createdBy: z.string().max(SINGLE_FIELD_INPUT_SMALL_MAX_LENGTH).optional()
    .describe('Identifier of who created this item (user email, ID, display name, or "ai-agent"). AI agents should use "ai-agent" as the default value.'),
  groupId: z.string().max(36).optional()
    .describe('UUID v4 identifier of the group this item belongs to. If not provided, item is not grouped.'),
}).strict();

export const BrainstormDataSchema = z.object({
  assumptions: createBrainstormItemSchema(
    'Brainstorm item for assumption. Assumption about the design, threats and migations of the application being threat modeled. Plain-text',
  ).array()
    .describe('Assumptions about the design, threats and migations of the application being threat modeled').optional(),

  threatSources: createBrainstormItemSchema(
    'Brainstorm item for threat source. The entity taking action. For example: An actor (a useful default), An internet-based actor, An internal or external actor. Plain-text',
  ).array()
    .describe('Brainstormed threat sources for the application being threat modeled').optional(),

  threatPrerequisites: createBrainstormItemSchema(
    'Brainstorm item for threat prerequisite. Conditions or requirements that must be met for a threat source\'s action to be viable. For example: -with access to another user\'s token. -who has administrator access -with user permissions - in a mitm position -with a network path to the API. If no prerequistes known return empty string, if know return but first word must be lower case. Plain-text',
  ).array()
    .describe('Brainstormed prerequisites for threats against the application being threat modeled').optional(),

  threatActions: createBrainstormItemSchema(
    'Brainstorm item for threat action. The action being performed by the threat source. For example: -spoof another user -tamper with data stored in the database -make thousands of concurrent requests. first word must be lower case. Plain-text',
  ).array()
    .describe('Brainstormed threat actions against the application being threat modeled').optional(),

  threatImpacts: createBrainstormItemSchema(
    'Brainstorm item for threat impact. What impact this has on the system.The direct impact of a successful threat action. For example: - unauthorized access to the user\'s bank account information -modifying the username for the all-time high score. -a web application being unable to handle other user requests.if know return but first word must be lower case. Plain-text',
  ).array()
    .describe('Brainstormed threat impacts for the application being threat modeled').optional(),

  assets: createBrainstormItemSchema(
    'Brainstorm item for asset. List of assets affected by this threat. If not known return empty string in array, else strings in array first word must be lower case. Plain-text',
  ).array()
    .describe('Brainstormed assets for the application being threat modeled').optional(),

  mitigations: createBrainstormItemSchema(
    'Brainstorm item for mitigation. Mitigation for the application being threat modeled. Plain-text',
  ).array()
    .describe('Mitigations for the application being threat modeled').optional(),
}).strict();

export const BrainstormItemSchema = createBrainstormItemSchema('Brainstorm content. Plain-text');

export type BrainstormData = z.infer<typeof BrainstormDataSchema>;
export type BrainstormItem = z.infer<typeof BrainstormItemSchema>;

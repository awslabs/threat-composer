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
import {
  FREE_TEXT_INPUT_MAX_LENGTH,
  SINGLE_FIELD_INPUT_MAX_LENGTH,
  SINGLE_FIELD_INPUT_SMALL_MAX_LENGTH,
  SINGLE_FIELD_INPUT_TAG_MAX_LENGTH,
  FREE_TEXT_INPUT_SMALL_MAX_LENGTH,
} from '../configs';

export const TagSchema = z.string().max(SINGLE_FIELD_INPUT_TAG_MAX_LENGTH);

export const MetadataCommentSchema = z.string().max(FREE_TEXT_INPUT_SMALL_MAX_LENGTH);

export const EntityBaseSchema = z.object({
  /**
   * The unique Id of the entity.
   */
  id: z.string(),
  /**
   * The numeric id of the entity.
   * The numericId will be displayed for users to easy identify the entity.
   */
  numericId: z.number(),
  /**
   * The display order of the entity in the list.
   */
  displayOrder: z.optional(z.number()),
  /**
   * The metadata.
   */
  metadata: z.object({
    key: z.string().max(SINGLE_FIELD_INPUT_SMALL_MAX_LENGTH),
    value: z.union([z.string(), z.array(z.string())]),
  }).array().optional(),
  /**
   * The tags.
   */
  tags: TagSchema.array().optional(),
});

export type EntityBase = z.infer<typeof EntityBaseSchema>;

export const ContentEntityBaseSchema = EntityBaseSchema.extend({
  /**
   * The text content of the Assumption.
   */
  content: z.string().max(SINGLE_FIELD_INPUT_MAX_LENGTH),
});

export type ContentEntityBase = z.infer<typeof ContentEntityBaseSchema>;

export const EntityLinkBaseSchema = z.object({
});

export type EntityLinkBase = z.infer<typeof EntityLinkBaseSchema>;

export const BaseImageInfoSchema = z.object({
  /**
   * The base64 encoded image or src of the image
   */
  image: z.string().optional(),
  /**
   * The description of the architecture diagram
   */
  description: z.string().max(FREE_TEXT_INPUT_MAX_LENGTH).optional(),
});

export type BaseImageInfo = z.infer<typeof BaseImageInfoSchema>;
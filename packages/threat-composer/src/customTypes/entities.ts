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
  SINGLE_FIELD_INPUT_SMALL_MAX_LENGTH,
  SINGLE_FIELD_INPUT_TAG_MAX_LENGTH,
  FREE_TEXT_INPUT_SMALL_MAX_LENGTH,
  LEVEL_SELECTOR_OPTIONS,
  REGEX_CONTENT_IMAGE_URL,
  REGEX_CONTENT_IMAGE_BASE64,
  IMAGE_BASE64_MAX_LENGTH,
  IMAGE_URL_MAX_LENGTH,
} from '../configs';
import STRIDE from '../data/stride';

export const TagSchema = z.string().nonempty().max(SINGLE_FIELD_INPUT_TAG_MAX_LENGTH);

export const MetadataCommentSchema = z.string().max(FREE_TEXT_INPUT_SMALL_MAX_LENGTH);

export const MetadataSchema = z.object({
  key: z.string().max(SINGLE_FIELD_INPUT_SMALL_MAX_LENGTH),
  value: z.union([z.string(), z.array(z.string())]),
}).strict().refine((data) => {
  if (data.key === 'Comments') {
    return MetadataCommentSchema.safeParse(data.value).success;
  }

  if (data.key === 'STRIDE') {
    return Array.isArray(data.value) && data.value.every(v => STRIDE.map(s => s.value).includes(v));
  }

  if (data.key === 'Priority') {
    return typeof data.value === 'string' && LEVEL_SELECTOR_OPTIONS.map(o => o.value).includes(data.value);
  }

  return false;
}, (data) => ({
  message: `Invalid key ${data.key} with value ${JSON.stringify(data.value)}`,
  path: [data.key],
}));

export type Metadata = z.infer<typeof MetadataSchema>;

export const MetadataNodeSchema = z.object({});

export type MetadataNode = z.infer<typeof MetadataNodeSchema>;

export const EntityBaseSchema = z.object({
  /**
   * The unique Id of the entity.
   */
  id: z.string().max(36),
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
  metadata: MetadataSchema.array().optional(),
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
  content: z.string().max(FREE_TEXT_INPUT_SMALL_MAX_LENGTH),
});

export type ContentEntityBase = z.infer<typeof ContentEntityBaseSchema>;

export const EntityLinkBaseSchema = z.object({
});

export type EntityLinkBase = z.infer<typeof EntityLinkBaseSchema>;

export const ImageUrlSchema = z.string().max(IMAGE_URL_MAX_LENGTH).regex(REGEX_CONTENT_IMAGE_URL).optional();
export const ImageBase64Schema = z.string().max(IMAGE_BASE64_MAX_LENGTH).regex(REGEX_CONTENT_IMAGE_BASE64).optional();

export const BaseImageInfoSchema = z.object({
  /**
   * The base64 encoded image or src of the image
   */
  image: z.string().optional().refine((data) => {
    return !data || ImageUrlSchema.safeParse(data).success || ImageBase64Schema.safeParse(data).success;
  }, {
    message: 'Invalid image format',
    path: [],
  }),
  /**
   * The description of the architecture diagram
   */
  description: z.string().max(FREE_TEXT_INPUT_MAX_LENGTH).optional(),
}).strict();

export type BaseImageInfo = z.infer<typeof BaseImageInfoSchema>;
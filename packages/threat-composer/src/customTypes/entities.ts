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
  METADATA_KEY_COMMENTS,
  METADATA_KEY_STRIDE,
  METADATA_KEY_PRIORITY,
  METADATA_KEY_PREFIX_CUSTOM,
  METADATA_KEY_SOURCE,
  METADATA_KEY_SOURCE_THREAT_PACK,
  METADATA_KEY_SOURCE_THREAT_PACK_THREAT,
  METADATA_KEY_SOURCE_THREAT_PACK_MITIGATION_CANDIDATE,
  METADATA_KEY_SOURCE_MITIGATION_PACK,
  METADATA_KEY_SOURCE_MITIGATION_PACK_MITIGATION,
  METADATA_SOURCE_THREAT_PACK,
  METADATA_SOURCE_MITIGATION_PACK,
} from '../configs';
import STRIDE from '../data/stride';

export const TagSchema = z.string().nonempty().max(SINGLE_FIELD_INPUT_TAG_MAX_LENGTH).describe('Tag value');

export const MetadataCommentSchema = z.string().max(FREE_TEXT_INPUT_SMALL_MAX_LENGTH).describe('Comment value');

export const MetadataSchemaMinimal = z.union([
  // Comments: string value
  z.object({
    key: z.literal(METADATA_KEY_COMMENTS),
    value: MetadataCommentSchema,
  }).strict(),

  // Custom keys: any key starting with "custom:" with flexible value
  z.object({
    key: z.string().startsWith(METADATA_KEY_PREFIX_CUSTOM).max(SINGLE_FIELD_INPUT_SMALL_MAX_LENGTH),
    value: z.union([z.string(), z.array(z.string())]),
  }).strict(),
]);

export type MetadataMinimal = z.infer<typeof MetadataSchemaMinimal>;

export const MetadataSchemaMitigation = z.union([
  ...MetadataSchemaMinimal.options, // Comments + custom keys

  // Source metadata
  z.object({
    key: z.literal(METADATA_KEY_SOURCE),
    value: z.enum([METADATA_SOURCE_MITIGATION_PACK]).describe('Source type indicating type of pack'),
  }).strict(),

  // Mitigation pack ID
  z.object({
    key: z.literal(METADATA_KEY_SOURCE_MITIGATION_PACK),
    value: z.string().min(1).max(SINGLE_FIELD_INPUT_TAG_MAX_LENGTH).describe('Identifier for the mitigation pack'),
  }).strict(),

  // Mitigation pack mitigation ID
  z.object({
    key: z.literal(METADATA_KEY_SOURCE_MITIGATION_PACK_MITIGATION),
    value: z.string().max(36).describe('UUID v4 identifier for the specific mitigation within the pack'),
  }).strict(),
]);

export type MetadataMitigation = z.infer<typeof MetadataSchemaMitigation>;

export const MetadataSchemaThreats = z.union([
  ...MetadataSchemaMinimal.options, // Comments + custom keys

  // Source metadata
  z.object({
    key: z.literal(METADATA_KEY_SOURCE),
    value: z.enum([METADATA_SOURCE_THREAT_PACK]).describe('Source type indicating type of pack'),
  }).strict(),

  // Stride: array of valid STRIDE values
  z.object({
    key: z.literal(METADATA_KEY_STRIDE),
    value: z.array(z.enum(STRIDE.map(s => s.value) as [string, ...string[]])),
  }).strict(),

  // Priority: single value from level options
  z.object({
    key: z.literal(METADATA_KEY_PRIORITY),
    value: z.enum(LEVEL_SELECTOR_OPTIONS.map(o => o.value) as [string, ...string[]]),
  }).strict(),

  // Threat pack ID
  z.object({
    key: z.literal(METADATA_KEY_SOURCE_THREAT_PACK),
    value: z.string().min(1).max(SINGLE_FIELD_INPUT_TAG_MAX_LENGTH).describe('Identifier for the threat pack'),
  }).strict(),

  // Threat pack threat ID
  z.object({
    key: z.literal(METADATA_KEY_SOURCE_THREAT_PACK_THREAT),
    value: z.string().max(36).describe('UUID v4 identifier for the specific threat within the pack'),
  }).strict(),

  // Threat pack mitigation candidate ID
  z.object({
    key: z.literal(METADATA_KEY_SOURCE_THREAT_PACK_MITIGATION_CANDIDATE),
    value: z.string().max(36).describe('UUID v4 identifier for the mitigation candidate from the threat pack'),
  }).strict(),
]);

export type MetadataThreats = z.infer<typeof MetadataSchemaThreats>;

export type Metadata = z.infer<typeof MetadataSchemaThreats>;

export const MetadataNodeSchema = z.object({});

export type MetadataNode = z.infer<typeof MetadataNodeSchema>;

export const EntityBaseSchema = z.object({
  /**
   * The unique Id of the entity.
   */
  id: z.string().max(36).describe('UUID v4 identifier'),
  /**
   * The numeric id of the entity.
   * The numericId will be displayed for users to easy identify the entity.
   */
  numericId: z.number().describe('Numeric identifier for display purposes'),
  /**
   * The display order of the entity in the list.
   */
  displayOrder: z.optional(z.number()).describe('Order for displaying threats'),
  /**
   * The metadata.
   */
  metadata: MetadataSchemaMinimal.array().optional().describe('Additional metadata as key-value pairs'),
  /**
   * The tags.
   */
  tags: TagSchema.array().optional().describe('Categorization tags'),
});

export type EntityBase = z.infer<typeof EntityBaseSchema>;

export const StatusSchema = z.string().optional();

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
export const MermaidDiagramSchema = z.string().regex(/^mermaid:/).max(FREE_TEXT_INPUT_MAX_LENGTH).optional();

export const BaseImageInfoSchema = z.object({
  /**
   * The base64 encoded image, image URL, or mermaid diagram code
   */
  image: z.string().optional().refine((data) => {
    if (!data) return true;
    return ImageUrlSchema.safeParse(data).success ||
           ImageBase64Schema.safeParse(data).success ||
           MermaidDiagramSchema.safeParse(data).success;
  }, {
    message: 'Invalid image or diagram format',
    path: [],
  }).describe(
    'Image URL, base64 image data, or mermaid diagram (prefixed with \'mermaid:\'). ' +
    `URLs: max ${IMAGE_URL_MAX_LENGTH} chars. ` +
    `Base64: max ${IMAGE_BASE64_MAX_LENGTH} chars. ` +
    `Mermaid: max ${FREE_TEXT_INPUT_MAX_LENGTH} chars.`,
  ),
  /**
   * The description of the architecture diagram
   */
  description: z.string().max(FREE_TEXT_INPUT_MAX_LENGTH).optional(),
}).strict();

export type BaseImageInfo = z.infer<typeof BaseImageInfoSchema>;

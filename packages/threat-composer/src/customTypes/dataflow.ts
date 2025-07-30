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
import { BaseImageInfoSchema } from './entities';

export const DataflowInfoSchema = z.object({
  description: BaseImageInfoSchema.shape.description.describe('Markdown detailed description of the application data flows. Start your headers from H3 maximum'),
  image: BaseImageInfoSchema.shape.image.describe('Data-flow diagram image (base64 or URL)'),
}).strict();

export type DataflowInfo = z.infer<typeof DataflowInfoSchema>;
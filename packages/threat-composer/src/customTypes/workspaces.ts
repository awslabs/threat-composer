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
import { SINGLE_FIELD_INPUT_SMALL_MAX_LENGTH } from '../configs';

export const WorkspaceSchema = z.object({
  id: z.string().length(36),
  name: z.string().max(SINGLE_FIELD_INPUT_SMALL_MAX_LENGTH),
});

export type Workspace = z.infer<typeof WorkspaceSchema>;
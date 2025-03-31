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

// Data exports
export { default as STRIDE, StrideItem } from './data/stride';

// Constants exports
export * from './constants';

// Schema exports
export * from './schemas/entities';
export * from './schemas/application';
export * from './schemas/architecture';
export * from './schemas/dataflow';
export * from './schemas/assumptions';
export * from './schemas/workspaces';
export * from './schemas/mitigations';
export * from './schemas/threats';
export * from './schemas/dataExchange';

// Utils exports
export { default as validateData } from './utils/validateData';

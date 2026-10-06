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
import STRIDE from '../../data/stride';

/**
 * The canonical STRIDE order: Spoofing, Tampering, Repudiation, Information
 * disclosure, Denial of service, Elevation of privilege.
 */
export const STRIDE_ORDER: string[] = STRIDE.map((s) => s.value);

const orderOf = (value: string) => {
  const index = STRIDE_ORDER.indexOf(value);
  // Values that are not part of STRIDE sort after the known ones, alphabetically.
  return index < 0 ? STRIDE_ORDER.length : index;
};

/**
 * Sorts STRIDE values into the canonical STRIDE order and removes duplicates, so
 * that badges always read S, T, R, I, D, E regardless of the order in which the
 * categories were recorded on the threat.
 *
 * Unknown values are kept, sorted after the STRIDE values in alphabetical order,
 * so that unexpected metadata is surfaced rather than silently dropped.
 */
const sortStrideValues = (values?: string[]): string[] => {
  if (!values || values.length === 0) {
    return [];
  }

  return Array.from(new Set(values)).sort((a, b) => {
    const orderDelta = orderOf(a) - orderOf(b);
    return orderDelta !== 0 ? orderDelta : a.localeCompare(b);
  });
};

export default sortStrideValues;

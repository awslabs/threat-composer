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
import { generatePath } from 'react-router-dom';
import { SEARCH_PARAM_FEATURES, SEARCH_PARAM_MODE } from '../../config/searchParams';
const SEARCH_PARAMS_KEPT = [SEARCH_PARAM_MODE, SEARCH_PARAM_FEATURES];

const generateUrl = (path: string, searchParams: URLSearchParams, workspaceId: string, threatId?: string,
  additionalParams?: {
    [key: string]: string;
  }, additionalSearchParams?: {
    [key: string]: string;
  }) => {
  const baseUrl = `${generatePath(path, {
    workspaceId,
    threatId,
    ...additionalParams,
  })}`;

  const newSearchParams = new URLSearchParams();

  const existingSearchParams = Array.from(searchParams.entries());

  if (existingSearchParams.length > 0) {
    existingSearchParams.forEach(pk => {
      if (pk.length === 2 && SEARCH_PARAMS_KEPT.includes(pk[0])) {
        newSearchParams.append(...pk);
      }
    });
  }

  if (additionalSearchParams) {
    Object.keys(additionalSearchParams).forEach(pk =>
      newSearchParams.append(
        pk, additionalSearchParams[pk],
      ));
  }

  const strSearchParams = newSearchParams.toString();
  if (strSearchParams.length > 0) {
    return `${baseUrl}?${strSearchParams}`;
  }

  return baseUrl;
};

export default generateUrl;
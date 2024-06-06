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

import { DEFAULT_WORKSPACE_ID } from '@aws/threat-composer';
import { useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import generateUrl from '../../utils/generateUrl';

const useNavigateView = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { workspaceId = DEFAULT_WORKSPACE_ID } = useParams();

  return useCallback((route: string) =>
    navigate(generateUrl(route, searchParams, workspaceId)),
  [
    searchParams, workspaceId,
  ]);
};

export default useNavigateView;
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
import { ThreatPacksComponent } from '@aws/threat-composer';
import { FC, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ROUTE_THREAT_PACK_PATH } from '../../config/routes';
import generateUrl from '../../utils/generateUrl';

const ThreatPacks: FC = () => {
  const [searchParms] = useSearchParams();
  const { workspaceId } = useParams();
  const navigate = useNavigate();

  const handleThreatPackLinkClick = useCallback((threatPackId: string) => {
    workspaceId && navigate(generateUrl(
      ROUTE_THREAT_PACK_PATH,
      searchParms,
      workspaceId,
      undefined,
      {
        threatPackId,
      }));
  }, []);

  if (!workspaceId) {
    return null;
  }

  return (<ThreatPacksComponent onThreatPackLinkClicked={handleThreatPackLinkClick} />);
};

export default ThreatPacks;
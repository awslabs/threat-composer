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
import { Mitigation } from '@aws/threat-composer-core';
import { METADATA_KEY_SOURCE, METADATA_KEY_SOURCE_THREAT_PACK, METADATA_KEY_SOURCE_THREAT_PACK_MITIGATION_CANDIDATE } from '../../configs';
import getMetadata from '../getMetadata';

const matchThreatPackMitigationCandidate = (mitigation: Mitigation, threatPackId: string, mitigationCandiateId: string) => {
  const metadata = getMetadata(mitigation.metadata);
  return (metadata[METADATA_KEY_SOURCE] === METADATA_KEY_SOURCE_THREAT_PACK &&
        metadata[METADATA_KEY_SOURCE_THREAT_PACK] === threatPackId &&
        metadata[METADATA_KEY_SOURCE_THREAT_PACK_MITIGATION_CANDIDATE] === mitigationCandiateId
  );
};

export default matchThreatPackMitigationCandidate;
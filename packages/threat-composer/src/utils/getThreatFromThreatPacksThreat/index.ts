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
import { v4 as uuidv4 } from 'uuid';
import { METADATA_KEY_SOURCE, METADATA_KEY_SOURCE_THREAT_PACK, METADATA_KEY_SOURCE_THREAT_PACK_THREAT, METADATA_SOURCE_THREAT_PACK } from '../../configs';
import { TemplateThreatStatement } from '../../customTypes';

const getThreatFromThreactPackThreat = (threatPackId: string, t: TemplateThreatStatement) => {
  return {
    ...t,
    numericId: -1,
    id: uuidv4(),
    tags: t.tags,
    metadata: [
      ...(t.metadata || []),
      {
        key: METADATA_KEY_SOURCE,
        value: METADATA_SOURCE_THREAT_PACK,
      },
      {
        key: METADATA_KEY_SOURCE_THREAT_PACK,
        value: threatPackId,
      },
      {
        key: METADATA_KEY_SOURCE_THREAT_PACK_THREAT,
        value: t.id,
      },
    ],
  };
};

export default getThreatFromThreactPackThreat;
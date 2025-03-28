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
import { ALL_LEVELS } from '@aws/threat-composer-core';
import { TemplateThreatStatement } from '../../customTypes';

const filterThreatsByMetadata = (threatList: TemplateThreatStatement[], metadataKey: string, metadataValue?: string) => {
  if (metadataValue === ALL_LEVELS) {
    return threatList;
  }

  if (!metadataValue) {
    return threatList.filter((s) => {
      if (!s.metadata) {
        return true;
      }

      const metadata = s.metadata.find(m => m.key === metadataKey);

      if (!metadata || !metadata.value) {
        return true;
      }

      if (Array.isArray(metadata.value) && metadata.value.length === 0) {
        return true;
      }

      return false;
    });
  }

  return threatList.filter((s) => {
    if (!s.metadata) {
      return false;
    }

    const metadata = s.metadata.find(m => m.key === metadataKey);

    if (!metadata || !metadata.value) {
      return false;
    }

    if (Array.isArray(metadata.value)) {
      return metadata.value.includes(metadataValue);
    }

    return metadata.value === metadataValue;
  });
};

export default filterThreatsByMetadata;

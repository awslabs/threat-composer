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
import { useCallback } from 'react';
import { EntityBase } from '../../customTypes';

const useEditMetadata = <T extends EntityBase>(onSaveEntity?: (updated: T) => void) => {
  return useCallback((entity: T, key: string, value: string | string[] | undefined) => {
    const updatedEntity = {
      ...entity,
      metadata: [...entity.metadata || []],
    };
    if (value) {
      const prevIndex = updatedEntity.metadata.findIndex(x => x.key === key);
      if (prevIndex >= 0) {
        updatedEntity.metadata = [
          ...updatedEntity.metadata.slice(0, prevIndex),
          ...[{ key, value }],
          ...updatedEntity.metadata.slice(prevIndex + 1),
        ];
      } else {
        updatedEntity.metadata.push({ key, value });
      }
    } else {
      updatedEntity.metadata = updatedEntity.metadata.filter(m => m.key !== key);
    }

    onSaveEntity?.(updatedEntity);
  }, [onSaveEntity]);

};

export default useEditMetadata;

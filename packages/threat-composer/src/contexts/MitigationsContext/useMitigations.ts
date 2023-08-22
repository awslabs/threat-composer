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
import { v4 as uuidV4 } from 'uuid';
import { Mitigation } from '../../customTypes';
import { DEFAULT_NEW_ENTITY_ID } from '../../configs';

const useMitigations = (
  _mitigationList: Mitigation[],
  setMitigationList: React.Dispatch<React.SetStateAction<Mitigation[]>>,
) => {
  const handlRemoveMitigation = useCallback((id: string) => {
    setMitigationList((prevList) => prevList.filter(x => x.id !== id));
  }, [setMitigationList]);

  const handleSaveMitigation = useCallback((mitigation: Mitigation) => {
    let newEntity = mitigation;
    setMitigationList((prevList) => {
      let numericId = mitigation.numericId;

      if (numericId === -1) {
        const maxId = prevList.reduce((max: number, cur: Mitigation) => {

          if (cur.numericId > max) {
            return cur.numericId;
          }

          return max;
        }, 0);
        numericId = maxId + 1;
      }

      let updated: Mitigation = {
        ...mitigation,
        numericId,
        id: mitigation.id === DEFAULT_NEW_ENTITY_ID ? uuidV4() : mitigation.id,
        displayOrder: numericId,
      };

      newEntity = { ...updated };

      const foundIndex = prevList.findIndex(st => st.id === updated.id);
      if (foundIndex >= 0) {
        return [...prevList.slice(0, foundIndex), updated, ...prevList.slice(foundIndex + 1)];
      }

      return [...prevList, updated];
    });

    return newEntity;
  }, [setMitigationList]);

  return {
    handlRemoveMitigation,
    handleSaveMitigation,
  }
}

export default useMitigations;
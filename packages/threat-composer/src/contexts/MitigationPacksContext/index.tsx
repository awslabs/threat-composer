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
import { FC, PropsWithChildren, useCallback, useMemo } from 'react';
import { MitigationPacksContext, useMitigationPacksContext } from './context';
import { MitigationPacksContextProviderProps } from './types';
import { METADATA_KEY_SOURCE, METADATA_KEY_SOURCE_MITIGATION_PACK, METADATA_KEY_SOURCE_MITIGATION_PACK_MITIGATION, METADATA_SOURCE_MITIGATION_PACK } from '../../configs';
import { MitigationPack, MitigationPackUsage, Mitigation } from '../../customTypes';
import mitigationPacks from '../../data/mitigationPacks/mitigationPacks';
import getMetadata from '../../utils/getMetadata';
import getNewMitigation from '../../utils/getNewMitigation';
import { useMitigationsContext } from '../MitigationsContext';

const MitigationPacksContextProvider: FC<PropsWithChildren<MitigationPacksContextProviderProps>> = ({
  children,
}) => {
  const getMitigationPack = useCallback(async (id: string) => {
    return mitigationPacks.find(x => x.id === id) as MitigationPack;
  }, []);

  const { mitigationList, saveMitigation } = useMitigationsContext();

  const mitigationPackUsage: MitigationPackUsage = useMemo(() => {
    const usage: MitigationPackUsage = {};

    mitigationList.forEach(s => {
      const metadata = getMetadata(s.metadata);
      if (metadata[METADATA_KEY_SOURCE] === METADATA_SOURCE_MITIGATION_PACK
        && metadata[METADATA_KEY_SOURCE_MITIGATION_PACK]
        && metadata[METADATA_KEY_SOURCE_MITIGATION_PACK_MITIGATION]) {

        const mitigationPackId = metadata[METADATA_KEY_SOURCE_MITIGATION_PACK] as string;

        if (!usage[mitigationPackId]) {
          usage[mitigationPackId] = {};
        }

        const mitigationPackMitigationId = metadata[METADATA_KEY_SOURCE_MITIGATION_PACK_MITIGATION] as string;

        if (!usage[mitigationPackId][mitigationPackMitigationId]) {
          usage[mitigationPackId][mitigationPackMitigationId] = [];
        }

        usage[mitigationPackId][mitigationPackMitigationId].push(s.id);
      }
    });

    return usage;
  }, [mitigationList]);

  const addMitigations = useCallback(async (mitigationPackId: string, mitigations: Mitigation[]) => {
    const usage = mitigationPackUsage[mitigationPackId] || {};

    mitigations.forEach(m => {
      if (!usage[m.id]) {
        saveMitigation({
          ...getNewMitigation(m.content),
          ...m,
          metadata: [
            ...(m.metadata || []),
            {
              key: METADATA_KEY_SOURCE,
              value: METADATA_SOURCE_MITIGATION_PACK,
            },
            {
              key: METADATA_KEY_SOURCE_MITIGATION_PACK,
              value: mitigationPackId,
            },
            {
              key: METADATA_KEY_SOURCE_MITIGATION_PACK_MITIGATION,
              value: m.id,
            },
          ],
        });
      }
    });

  }, [mitigationPackUsage, saveMitigation]);

  return (<MitigationPacksContext.Provider
    value={{
      mitigationPacks,
      mitigationPackUsage,
      getMitigationPack,
      addMitigations,
    }}
  >
    {children}
  </MitigationPacksContext.Provider>);
};

export default MitigationPacksContextProvider;

export {
  useMitigationPacksContext,
};

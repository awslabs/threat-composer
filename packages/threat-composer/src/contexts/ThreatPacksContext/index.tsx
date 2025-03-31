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
import { TemplateThreatStatement } from '@aws/threat-composer-core';
import { FC, PropsWithChildren, useCallback, useMemo } from 'react';

import { ThreatPacksContext, useThreatPacksContext } from './context';
import { ThreatPacksContextProviderProps } from './types';
import { METADATA_KEY_SOURCE, METADATA_KEY_SOURCE_THREAT_PACK, METADATA_KEY_SOURCE_THREAT_PACK_THREAT, METADATA_SOURCE_THREAT_PACK } from '../../configs';
import { ThreatPack, ThreatPackUsage } from '../../customTypes';
import threatPacks from '../../data/threatPacks/threatPacks';
import getMetadata from '../../utils/getMetadata';
import getThreatFromThreactPackThreat from '../../utils/getThreatFromThreatPacksThreat';
import { useThreatsContext } from '../ThreatsContext';

const ThreatPacksContextProvider: FC<PropsWithChildren<ThreatPacksContextProviderProps>> = ({
  children,
}) => {
  const getThreatPack = useCallback(async (id: string) => {
    return threatPacks.find(x => x.id === id) as ThreatPack;
  }, []);

  const { statementList, saveStatement } = useThreatsContext();

  const threatPackUsage: ThreatPackUsage = useMemo(() => {
    const usage: ThreatPackUsage = {};

    statementList.forEach(s => {
      const metadata = getMetadata(s.metadata);
      if (metadata[METADATA_KEY_SOURCE] === METADATA_SOURCE_THREAT_PACK
        && metadata[METADATA_KEY_SOURCE_THREAT_PACK]
        && metadata[METADATA_KEY_SOURCE_THREAT_PACK_THREAT]) {

        const threatPackId = metadata[METADATA_KEY_SOURCE_THREAT_PACK] as string;

        if (!usage[threatPackId]) {
          usage[threatPackId] = {};
        }

        const threatPackThreatId = metadata[METADATA_KEY_SOURCE_THREAT_PACK_THREAT] as string;

        if (!usage[threatPackId][threatPackThreatId]) {
          usage[threatPackId][threatPackThreatId] = [];
        }

        usage[threatPackId][threatPackThreatId].push(s.id);
      }
    });

    return usage;
  }, [statementList]);

  const addThreats = useCallback(async (threatPackId: string, threats: TemplateThreatStatement[]) => {
    const usage = threatPackUsage[threatPackId] || {};

    threats.forEach(t => {
      if (!usage[t.id]) {
        saveStatement(getThreatFromThreactPackThreat(threatPackId, t));
      }
    });
  }, [threatPackUsage, saveStatement]);

  const getMitigationCandidates = useCallback(async(threatPackId: string, threatPackThreatId: string) => {
    const threatPack = await getThreatPack(threatPackId);
    if (threatPack) {
      const linkedMitigations = threatPack.mitigationLinks?.filter(x => x.linkedId === threatPackThreatId) || [];
      return threatPack.mitigations?.filter(x => linkedMitigations.some(y => y.mitigationId === x.id)) || [];
    }

    return [];
  }, []);

  return (<ThreatPacksContext.Provider
    value={{
      threatPacks,
      threatPackUsage,
      getThreatPack,
      addThreats,
      getMitigationCandidates,
    }}
  >
    {children}
  </ThreatPacksContext.Provider>);
};

export default ThreatPacksContextProvider;

export {
  useThreatPacksContext,
};

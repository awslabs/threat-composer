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
import { useMemo } from 'react';
import { useApplicationInfoContext } from '../../contexts/ApplicationContext';
import { useArchitectureInfoContext } from '../../contexts/ArchitectureContext';
import { useAssumptionsContext } from '../../contexts/AssumptionsContext';
import { useDataflowInfoContext } from '../../contexts/DataflowContext';
import { useMitigationsContext } from '../../contexts/MitigationsContext';
import { useThreatsContext } from '../../contexts/ThreatsContext';
import { hasApplicationInfo, hasArchitectureInfo, hasAssumptions, hasDataflowInfo, hasMitigations, hasThreats } from '../../utils/hasContent';

const useHasContent = () => {
  const { applicationInfo } = useApplicationInfoContext();
  const { architectureInfo } = useArchitectureInfoContext();
  const { dataflowInfo } = useDataflowInfoContext();
  const { assumptionList } = useAssumptionsContext();
  const { mitigationList } = useMitigationsContext();
  const { statementList } = useThreatsContext();

  const hasContent = useMemo(() => {
    const details = {
      applicationInfo: hasApplicationInfo(applicationInfo),
      architecture: hasArchitectureInfo(architectureInfo),
      dataflow: hasDataflowInfo(dataflowInfo),
      assumptions: hasAssumptions(assumptionList),
      mitigations: hasMitigations(mitigationList),
      threats: hasThreats(statementList),
    };

    const sum = Object.values(details).some(x => x);

    return [sum, details];
  }, [applicationInfo, architectureInfo, dataflowInfo, assumptionList, mitigationList, statementList]);

  return hasContent;
};

export default useHasContent;
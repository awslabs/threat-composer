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
import { useMemo } from 'react';
import threatStatementExamplesData from '../../../../data/threatStatementExamples.json';
import renderThreatStatement from '../../../../utils/renderThreatStatement';
import { PerFieldExamplesType, DEFAULT_PER_FIELD_EXAMPLES } from '../../context';
import {
  addNewValueToStringArray,
  addNewValueArrayToStringArray,
  addNewValueArrayToStringArrayArray,
  addNewValueToPerFieldExampleArray,
} from '../../utils';

const useThreatExamples = (
  statementList: TemplateThreatStatement[],
) => {
  const threatStatementExamples = useMemo(() => {
    return threatStatementExamplesData.map(e => {
      const { statement, displayedStatement } = renderThreatStatement(e);
      return {
        ...e,
        statement,
        displayedStatement,
      };
    });
  }, []);

  const perFieldExamples: PerFieldExamplesType = useMemo(() => {
    return (threatStatementExamples as TemplateThreatStatement[]).reduce((agg: PerFieldExamplesType, st: TemplateThreatStatement, index: number) => {
      return {
        threat_source: addNewValueToStringArray(agg.threat_source, st.threatSource),
        prerequisites: addNewValueToPerFieldExampleArray(agg.prerequisites, 'prerequisites', st, index),
        threat_action: addNewValueToPerFieldExampleArray(agg.threat_action, 'threatAction', st, index),
        threat_impact: addNewValueToPerFieldExampleArray(agg.threat_impact, 'threatImpact', st, index),
        impacted_goal: addNewValueArrayToStringArrayArray(agg.impacted_goal, st.impactedGoal),
        impacted_assets: addNewValueArrayToStringArray(agg.impacted_assets, st.impactedAssets),
      };
    }, DEFAULT_PER_FIELD_EXAMPLES);
  }, [threatStatementExamples]);

  const previousInputs: PerFieldExamplesType = useMemo(() => {
    return statementList
      .map(ts => ts as TemplateThreatStatement)
      .reduce((agg: PerFieldExamplesType, st: TemplateThreatStatement, index: number) => {
        return {
          threat_source: addNewValueToStringArray(agg.threat_source, st.threatSource),
          prerequisites: addNewValueToPerFieldExampleArray(agg.prerequisites, 'prerequisites', st, index),
          threat_action: addNewValueToPerFieldExampleArray(agg.threat_action, 'threatAction', st, index),
          threat_impact: addNewValueToPerFieldExampleArray(agg.threat_impact, 'threatImpact', st, index),
          impacted_goal: addNewValueArrayToStringArrayArray(agg.impacted_goal, st.impactedGoal),
          impacted_assets: addNewValueArrayToStringArray(agg.impacted_assets, st.impactedAssets),
        };
      }, DEFAULT_PER_FIELD_EXAMPLES);
  }, [statementList]);

  return {
    threatStatementExamples,
    perFieldExamples,
    previousInputs,
  };
};

export default useThreatExamples;
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
import { TemplateThreatStatement } from '../../customTypes';
import { threatFieldTypeMapping, ThreatFieldTypes } from '../../customTypes/threatFieldTypes';
import threatFieldData from '../../data/threatFieldData';
import threatStatementFormat from '../../data/threatStatementFormat';
import calculateFieldCombination from '../calculateFieldCombination';
import correctIndefiniteArticle from '../correctIndefiniteArticle';
import getFieldContentByToken from '../getFieldContentByToken';
import renderArrayField from '../renderArrayField';

const threatStatementFormatKeys = Object.keys(threatStatementFormat);

export const PLACEHOLDER = '<placeholder>';

const renderThreatStatement = (statement: TemplateThreatStatement): {
  statement: string;
  displayedStatement?: (string | { type: string; content: string })[];
  suggestions: string[];
} => {
  const { fieldCombination, filledField } = calculateFieldCombination(statement);

  // No field is filled
  if (fieldCombination === 0) {
    return {
      statement: '',
      displayedStatement: [],
      suggestions: [],
    };
  }

  const suggestions: string[] = [];

  (['prerequisites', 'threat_action', 'threat_impact'] as ThreatFieldTypes[]).forEach((token) => {
    const content = statement[threatFieldTypeMapping[token]];
    if (content !== '' && typeof content === 'string' && content.split(' ').length === 1) {
      suggestions.push(
        `[${token}] Looks like your ${token} is a single word, consider being more descriptive`,
      );
    }
  });

  // Only one field is filled
  if (filledField.length === 1) {
    let prefix = '...', suffix = '...';
    if (threatFieldData[filledField[0]].fieldPosition === 1) {
      prefix = '';
      suffix = '...';
    } else if (threatFieldData[filledField[0]].fieldPosition === Object.keys(threatFieldData).length) {
      prefix = '...';
      suffix = '';
    }

    return {
      statement: `${prefix}${getFieldContentByToken(filledField[0] as ThreatFieldTypes, statement)}${suffix}`,
      suggestions,
    };
  }

  // Multiple fields are filled
  if (!statement.threatSource) {
    suggestions.push(
      '[threat_source] Consider specifying who or what is the source of the threat',
    );
  }

  if (!statement.prerequisites) {
    suggestions.push(
      '[prerequisites] Consider what conditions or requirement that must be met in order for a threat sources actions to be viable',
    );
    suggestions.push(
      '[prerequisites] No prerequisites this is often a sign you can decompose into multiple threat statements that have different prerequisites',
    );
  }

  if (!statement.threatAction) {
    suggestions.push(
      '[threat_action] Consider what actions are being performed by, or related to the threat source. Knowing this is required in order to mitigate the threat',
    );
  }

  const updatedStatement: TemplateThreatStatement = {
    ...statement,
    threatSource: statement.threatSource || 'threat source',
    prerequisites: statement.prerequisites || PLACEHOLDER,
    threatAction: statement.threatAction || 'perform a threat action',
  };

  const { fieldCombination: updatedFieldCombination } = calculateFieldCombination(updatedStatement);

  let format = null;

  if (threatStatementFormatKeys.includes(updatedFieldCombination.toString())) {
    format = threatStatementFormat[updatedFieldCombination];
  }

  let output = statement.customTemplate || format?.template || '';
  suggestions.push(...format?.suggestions || []);

  const hasThreatAction = output.indexOf('[threat_action]') >= 0;

  output = output.replace('[threat_source]', updatedStatement.threatSource || '');
  output = output.replace('[prerequisites]', ((!updatedStatement.prerequisites) || updatedStatement.prerequisites === PLACEHOLDER ? '' : updatedStatement.prerequisites));
  output = output.replace('[threat_impact]', updatedStatement.threatImpact || '');
  output = output.replace('[impacted_goal]', renderArrayField(updatedStatement.impactedGoal, true));
  output = output.replace('[impacted_assets]', renderArrayField(updatedStatement.impactedAssets, false));

  const displayedOutputTokens = hasThreatAction && output.split('[threat_action]');

  const displayedOutput = displayedOutputTokens && [
    correctIndefiniteArticle(displayedOutputTokens[0]),
    {
      type: 'b',
      content: correctIndefiniteArticle(updatedStatement.threatAction || ''),
    },
    ...displayedOutputTokens.length > 1 ? [correctIndefiniteArticle(displayedOutputTokens[1])] : [],
  ];

  output = output.replace('[threat_action]', updatedStatement.threatAction || '');
  output = correctIndefiniteArticle(output);

  // Replace multiple white spaces with a single one
  output = output.replace(/\s\s+/g, ' ');

  return {
    statement: output,
    displayedStatement: displayedOutput || undefined,
    suggestions: suggestions.sort(),
  };
};

export default renderThreatStatement;

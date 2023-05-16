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
import { TemplateThreatStatement, threatFieldTypeMapping, ThreatFieldTypes, ThreatStatementDisplayToken } from '../../customTypes';
import threatFieldData from '../../data/threatFieldData';
import threatStatementFormat from '../../data/threatStatementFormat';
import calculateFieldCombination from '../calculateFieldCombination';
import getFieldContentByToken from '../getFieldContentByToken';
import parseThreatStatement from '../parseThreatStatement';

const threatStatementFormatKeys = Object.keys(threatStatementFormat);

export const PLACEHOLDER = '<placeholder>';

const renderThreatStatement = (statement: TemplateThreatStatement): {
  statement: string;
  displayedStatement?: (ThreatStatementDisplayToken | string)[];
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

  suggestions.push(...format?.suggestions || []);

  const outputProcessor = (token: string, content: string, before: string, _filled: boolean) => {
    const output: {
      stringOutput: string;
      displayOutput: string | ThreatStatementDisplayToken;
    }[] = [];

    output.push({
      stringOutput: before,
      displayOutput: before,
    });

    const displayedOutput = token === 'threat_action' ? {
      type: 'b',
      content: content,
      tooltip: threatFieldData[token]?.tooltip,
    } : {
      type: 'span',
      content: content,
      tooltip: threatFieldData[token]?.tooltip,
    };

    output.push({
      stringOutput: content,
      displayOutput: displayedOutput,
    });

    return output;
  };

  const parseOutput = parseThreatStatement({
    statement: statement,
    template: statement.customTemplate || format?.template || '',
    outputProcessor: outputProcessor,
  });

  return {
    statement: parseOutput.map(x => x.stringOutput).join(' ').replace(/\s\s+/g, ' '),
    displayedStatement: parseOutput.map(x => x.displayOutput),
    suggestions: suggestions.sort(),
  };
};

export default renderThreatStatement;

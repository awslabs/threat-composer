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
import a from 'indefinite';
import { TemplateThreatStatement, ThreatFieldTypes, threatFieldTypeMapping } from '../../customTypes';
import correctIndefiniteArticle from '../correctIndefiniteArticle';
import getFieldContentByToken from '../getFieldContentByToken';

interface ThreatStatementParseArgType<T> {
  template: string;
  statement: TemplateThreatStatement;
  outputProcessor: (token: string, content: string, before: string, filled: boolean) => T[];
}

const parseThreatStatement = <T extends any>(args: ThreatStatementParseArgType<T>) => {
  const output: T[] = [];
  let template = args.template;
  while (true) {
    const startIndex = template.indexOf('[');
    if (startIndex < 0) {
      break;
    }
    let before = template.slice(0, startIndex);

    const endIndex = template.indexOf(']');
    if (endIndex < 0) {
      break;
    }
    const token = template.slice(startIndex + 1, endIndex) as ThreatFieldTypes;
    const content = correctIndefiniteArticle(getFieldContentByToken(token, args.statement));

    // This is to cater for the A for the threat source.
    if (before === 'A ') {
      before = before.replace('A', a(content, { capitalize: true, articleOnly: true }));
    }

    before = correctIndefiniteArticle(before);
    let value = args.statement[threatFieldTypeMapping[token]];

    const filled = !!(value && (typeof value === 'string' || (Array.isArray(value) && value.length > 0)));

    output.push(...args.outputProcessor(token, content, before, filled));

    template = template.slice(endIndex + 1);
  }

  return output;
};

export default parseThreatStatement;
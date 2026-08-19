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
import { transformExcludingMermaidDefinitions } from './index';

const upperCase = (value: string) => value.toUpperCase();

describe('transformExcludingMermaidDefinitions', () => {
  test('transforms content without code blocks', () => {
    expect(transformExcludingMermaidDefinitions('some content', upperCase)).toEqual('SOME CONTENT');
  });

  test('keeps the definition of a mermaid code block', () => {
    const content = 'before\n\n```mermaid\nflowchart LR\n  A[User] --> B[App]\n```\n\nafter';
    expect(transformExcludingMermaidDefinitions(content, upperCase))
      .toEqual('BEFORE\n\n```MERMAID\nflowchart LR\n  A[User] --> B[App]\n```\n\nAFTER');
  });

  test('keeps the definitions of multiple mermaid code blocks', () => {
    const content = '```mermaid\ngraph TD\n  A --> B\n```\ntext\n```mermaid\ngraph TD\n  C --> D\n```';
    expect(transformExcludingMermaidDefinitions(content, upperCase))
      .toEqual('```MERMAID\ngraph TD\n  A --> B\n```\nTEXT\n```MERMAID\ngraph TD\n  C --> D\n```');
  });

  test('transforms the content of code blocks of other languages', () => {
    const content = '```javascript\nconst a = 1;\n```';
    expect(transformExcludingMermaidDefinitions(content, upperCase)).toEqual('```JAVASCRIPT\nCONST A = 1;\n```');
  });

  test('transforms the content of code blocks without language', () => {
    const content = '```\nsome code\n```';
    expect(transformExcludingMermaidDefinitions(content, upperCase)).toEqual('```\nSOME CODE\n```');
  });

  test('supports tilde fences and uppercase language', () => {
    const content = '~~~MERMAID\nflowchart LR\n  A --> B\n~~~';
    expect(transformExcludingMermaidDefinitions(content, upperCase)).toEqual(content);
  });

  test('keeps fences of other lengths inside a mermaid code block', () => {
    const content = '````mermaid\nflowchart LR\n```\n  A --> B\n````\nafter';
    expect(transformExcludingMermaidDefinitions(content, upperCase))
      .toEqual('````MERMAID\nflowchart LR\n```\n  A --> B\n````\nAFTER');
  });

  test('keeps the definition of an unterminated mermaid code block', () => {
    const content = 'before\n```mermaid\nflowchart LR\n  A --> B';
    expect(transformExcludingMermaidDefinitions(content, upperCase))
      .toEqual('BEFORE\n```MERMAID\nflowchart LR\n  A --> B');
  });
});

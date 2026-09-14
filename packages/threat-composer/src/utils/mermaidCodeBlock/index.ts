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

/**
 * The fenced code block language used for Mermaid diagram definitions.
 */
export const MERMAID_LANGUAGE = 'mermaid';

const FENCE_REGEX = /^\s{0,3}(`{3,}|~{3,})\s*(\S+)?/;

/**
 * Splits the content into segments, flagging the ones holding a Mermaid diagram definition.
 * The fences themselves are part of the surrounding segments.
 */
const splitMermaidDefinitions = (content: string) => {
  const segments: { content: string[]; isMermaidDefinition: boolean }[] = [];
  let openingFence: string | undefined;
  let isMermaidDefinition = false;

  const pushLine = (line: string, isDefinition: boolean) => {
    const lastSegment = segments[segments.length - 1];

    if (lastSegment && lastSegment.isMermaidDefinition === isDefinition) {
      lastSegment.content.push(line);
    } else {
      segments.push({ content: [line], isMermaidDefinition: isDefinition });
    }
  };

  content.split('\n').forEach(line => {
    const fence = FENCE_REGEX.exec(line);

    if (openingFence) {
      // A closing fence is at least as long as the opening one and has no language attached to it
      if (fence && fence[1].startsWith(openingFence) && !fence[2]) {
        openingFence = undefined;
        isMermaidDefinition = false;
        pushLine(line, false);
      } else {
        pushLine(line, isMermaidDefinition);
      }

      return;
    }

    if (fence) {
      openingFence = fence[1];
      isMermaidDefinition = fence[2]?.toLowerCase() === MERMAID_LANGUAGE;
    }

    pushLine(line, false);
  });

  return segments;
};

/**
 * Applies the transform to the content, leaving any Mermaid diagram definition it contains untouched.
 *
 * Mermaid definitions contain sequences such as `-->` and `->>`, which html handling would otherwise
 * mangle. They are rendered as diagrams by {@link MermaidDiagram} rather than as html, hence are
 * kept as authored.
 */
export const transformExcludingMermaidDefinitions = (content: string, transform: (value: string) => string) =>
  splitMermaidDefinitions(content)
    .map(segment => {
      const segmentContent = segment.content.join('\n');
      return segment.isMermaidDefinition ? segmentContent : transform(segmentContent);
    })
    .join('\n');

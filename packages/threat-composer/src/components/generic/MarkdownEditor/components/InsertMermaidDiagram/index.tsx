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
import Icon from '@cloudscape-design/components/icon';
import { ButtonWithTooltip, insertCodeBlock$, usePublisher } from '@mdxeditor/editor';
import { FC, useCallback } from 'react';
import { MERMAID_LANGUAGE } from '../../../../../utils/mermaidCodeBlock';
import { DEFAULT_MERMAID_DIAGRAM } from '../MermaidCodeBlockEditor';

/**
 * Toolbar button inserting a mermaid diagram code block, pre-filled with a starter diagram.
 */
const InsertMermaidDiagram: FC = () => {
  const insertCodeBlock = usePublisher(insertCodeBlock$);

  const handleClick = useCallback(() => {
    insertCodeBlock({
      language: MERMAID_LANGUAGE,
      code: DEFAULT_MERMAID_DIAGRAM,
    });
  }, [insertCodeBlock]);

  return (<ButtonWithTooltip title='Insert Mermaid diagram' aria-label='Insert Mermaid diagram' onClick={handleClick}>
    <Icon name='share' />
  </ButtonWithTooltip>);
};

export default InsertMermaidDiagram;

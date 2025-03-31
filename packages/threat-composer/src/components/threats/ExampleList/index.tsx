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
/** @jsxImportSource @emotion/react */
import { PerFieldExample } from '@aws/threat-composer-core';
import Button from '@cloudscape-design/components/button';
import Grid from '@cloudscape-design/components/grid';
import Input from '@cloudscape-design/components/input';
import SpaceBetween from '@cloudscape-design/components/space-between';
import TextContent from '@cloudscape-design/components/text-content';
import Toggle from '@cloudscape-design/components/toggle';
import * as awsui from '@cloudscape-design/design-tokens';
import { css } from '@emotion/react';
import { useCallback, useMemo, useState } from 'react';
import { useThreatsContext } from '../../../contexts/ThreatsContext/context';
import renderArrayField from '../../../utils/renderArrayField';
import shuffle from '../../../utils/shuffle';

export const DEFAULT_NUM_DISPLAY = 5;

const styles = {
  list: css({
    '& button': {
      padding: `0px ${awsui.spaceStaticXxs} !important`,
    },
  }),
};

export interface ExampleListProps<T> {
  examples: T[];
  onSelect: (example: string) => void;
  showSearch?: boolean;
}

const ExampleList = <T extends string | PerFieldExample | string[]>({
  examples,
  onSelect,
  showSearch = true,
}: ExampleListProps<T>) => {
  const [showMoreExamples, setShowMoreExamples] = useState(false);
  const [showFullExample, setShowFullExample] = useState(false);
  const { threatStatementExamples } = useThreatsContext();
  const [filterText, setFilterText] = useState('');

  const randomDislayList = useMemo(() => {
    let randomExamples = shuffle(examples);
    if (filterText) {
      randomExamples = randomExamples.filter(re => {
        if (typeof re === 'string') {
          return re.toLowerCase().indexOf(filterText) >= 0;
        }

        if (Array.isArray(re)) {
          return re.some(e => e.toLowerCase().indexOf(filterText) >= 0);
        }

        return (re as PerFieldExample).example.toLowerCase().indexOf(filterText) >= 0;
      });
    }

    return randomExamples;
  }, [examples, filterText]);

  const showFullExampleToggle = useMemo(() => {
    if (examples && examples.length > 0) {
      return typeof examples[0] !== 'string' && !!(examples[0] as PerFieldExample).example;
    }

    return false;
  }, [examples]);

  const renderExample = useCallback((example: T) => {
    if (typeof example === 'string') {
      return (<Button variant='link' onClick={() => onSelect(example)}>
        {example}
      </Button>);
    }

    if (Array.isArray(example) && example.length > 0 && typeof example[0] === 'string') {
      const exampleStr = renderArrayField(example);
      return (<Button variant='link' onClick={() => onSelect(exampleStr)}>
        {exampleStr}
      </Button>);
    }

    const perFieldExamples = example as PerFieldExample;

    if (typeof perFieldExamples.fromId !== 'undefined' && typeof perFieldExamples.example !== 'undefined') {
      if (showFullExample) {
        const fullExample = threatStatementExamples[perFieldExamples.fromId].statement;

        if (fullExample) {
          const index = fullExample.indexOf(perFieldExamples.example);
          return (<>
            <span>{fullExample.slice(0, index)}</span>
            <Button variant='link' onClick={() => onSelect(perFieldExamples.example)}>
              {perFieldExamples.example}
            </Button>
            <span>{fullExample.slice(index + perFieldExamples.example.length)}</span>
          </>);
        }
      }

      return (<Button variant='link' onClick={() => onSelect(perFieldExamples.example)}>
        {perFieldExamples.example}
      </Button>);
    }

    return undefined;
  }, [showFullExample, threatStatementExamples]);

  return (<TextContent>
    <SpaceBetween direction='vertical' size='m'>
      <SpaceBetween direction='horizontal' size='m'>
        <span>Examples:</span>
        {showFullExampleToggle &&
          <Toggle checked={showFullExample} onChange={({ detail }) => setShowFullExample(detail.checked)}>Show full examples</Toggle>}
      </SpaceBetween>
      {showSearch && <Grid gridDefinition={[
        { colspan: { default: 12, xxs: 6 } },
      ]}>
        <Input value={filterText} onChange={({ detail }) => setFilterText(detail.value)} placeholder='Search examples' />
      </Grid>}
      <ul>
        {randomDislayList.slice(0, showMoreExamples ? undefined : DEFAULT_NUM_DISPLAY).map((example, index) => (
          <li key={index} css={styles.list}>{renderExample(example)}</li>
        ))}
      </ul>
      {randomDislayList.length > DEFAULT_NUM_DISPLAY && (<Button
        iconName={showMoreExamples ? 'treeview-collapse' : 'treeview-expand'}
        onClick={() => setShowMoreExamples(prev => !prev)}
        variant='link'>
        {showMoreExamples ? 'Show less examples' : 'Show more examples'}
      </Button>)}
    </SpaceBetween>
  </TextContent>);
};

export default ExampleList;
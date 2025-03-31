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
import { TemplateThreatStatement } from '@aws/threat-composer-core';
import Badge from '@cloudscape-design/components/badge';
import { SelectProps } from '@cloudscape-design/components/select';
import * as awsui from '@cloudscape-design/design-tokens';
import { css } from '@emotion/react';
import { FC, useMemo, useState, useRef } from 'react';
import PriorityEdit from '..//PriorityEdit';

export interface PriorityBadgeProps {
  editingStatement: TemplateThreatStatement;
  onEditMetadata: (statement: TemplateThreatStatement, key: string, value: string | string[] | undefined) => void;
}

const PRIORITY_COLOR_MAPPING: any = {
  High: 'red',
  Medium: 'blue',
  Low: 'green',
  NoSet: 'grey',
};

const PriorityBadge: FC<PriorityBadgeProps> = ({
  editingStatement,
  onEditMetadata,
}) => {
  const ref = useRef<SelectProps.Ref>();
  const priority = useMemo(() => {
    return (editingStatement.metadata?.find(m => m.key === 'Priority')?.value as string) || undefined;
  }, [editingStatement.metadata]);

  const [editMode, setEditMode] = useState(false);

  const editor = useMemo(() => {
    return <PriorityEdit
      ref={ref}
      showLabel={false}
      editingStatement={editingStatement}
      onEditMetadata={onEditMetadata}
      onBlur={() => setEditMode(false)}
    />;
  }, [editingStatement, onEditMetadata]);

  return <div>{editMode ? (editor) :
    (<button
      onClick={() => {
        setEditMode(true);
        setTimeout(() => ref.current?.focus(), 200);
      }}
      css={css`
        background: none;
        color: inherit;
        border: none;
        padding: 0;
        paddingBottom: ${awsui.spaceScaledXxs};
        font: inherit;
        cursor: pointer;
        outline: inherit;
        verticalAlign: middle;
      `}>
      <Badge color={PRIORITY_COLOR_MAPPING[priority || 'NoSet'] || 'grey'}>{priority || 'Priority Not Set'}</Badge>
    </button>)}</div>;
};

export default PriorityBadge;
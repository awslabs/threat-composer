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
import { SelectProps } from '@cloudscape-design/components/select';
import React, { FC, useMemo } from 'react';
import { TemplateThreatStatement } from '../../../customTypes';
import LevelSelector from '../../generic/LevelSelector';

export interface PriorityEditProps {
  showLabel?: boolean;
  editingStatement: TemplateThreatStatement;
  onEditMetadata: (statement: TemplateThreatStatement, key: string, value: string | string[] | undefined) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  ref?: React.LegacyRef<any>;
}

const PriorityEdit: FC<PriorityEditProps> = React.forwardRef<SelectProps.Ref, PriorityEditProps>(({
  editingStatement,
  onEditMetadata,
  showLabel = true,
  ...props
}, ref) => {
  const priority = useMemo(() => {
    return (editingStatement.metadata?.find(m => m.key === 'Priority')?.value as string) || undefined;
  }, [editingStatement.metadata]);

  return (
    <LevelSelector
      ref={ref}
      {...props}
      allowNoValue
      placeholder='Select Priority'
      label={showLabel ? 'Priority' : undefined}
      selectedLevel={priority}
      setSelectedLevel={(selectedLevel) => onEditMetadata(editingStatement, 'Priority', selectedLevel)}
    />
  );
});;

export default PriorityEdit;

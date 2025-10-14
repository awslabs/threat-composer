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
import { Container, SpaceBetween, Toggle } from '@cloudscape-design/components';
import { FC } from 'react';

/**
 * Props interface for ColumnVisibilityToggles component
 */
export interface ColumnVisibilityTogglesProps {
  /** Record of column visibility states by column ID */
  visibleColumns: Record<string, boolean>;
  /** Callback when individual column visibility changes */
  onColumnVisibilityChange: (columnId: string, visible: boolean) => void;
  /** Whether threat inputs are visible as a group */
  threatInputsVisible: boolean;
  /** Callback when threat inputs group visibility changes */
  onThreatInputsVisibilityChange: (visible: boolean) => void;
}

/**
 * ColumnVisibilityToggles component for managing column visibility
 *
 * Provides toggles for individual columns and a master toggle for threat inputs
 */
export const ColumnVisibilityToggles: FC<ColumnVisibilityTogglesProps> = ({
  visibleColumns,
  onColumnVisibilityChange,
  threatInputsVisible,
  onThreatInputsVisibilityChange,
}) => {
  return (
    <Container>
      <SpaceBetween direction="horizontal" size="xs">
        <Toggle
          checked={visibleColumns.assumptions}
          onChange={({ detail }) =>
            onColumnVisibilityChange('assumptions', detail.checked)
          }
        >
          Assumptions
        </Toggle>
        <Toggle
          checked={threatInputsVisible}
          onChange={({ detail }) => onThreatInputsVisibilityChange(detail.checked)}
        >
          Threat Inputs
        </Toggle>
        <Toggle
          checked={visibleColumns.mitigations}
          onChange={({ detail }) =>
            onColumnVisibilityChange('mitigations', detail.checked)
          }
        >
          Mitigations
        </Toggle>
      </SpaceBetween>
    </Container>
  );
};

export default ColumnVisibilityToggles;
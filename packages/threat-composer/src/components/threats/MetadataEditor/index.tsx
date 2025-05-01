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
import ExpandableSection, { ExpandableSectionProps } from '@cloudscape-design/components/expandable-section';
import Grid from '@cloudscape-design/components/grid';
import { OptionDefinition } from '@cloudscape-design/components/internal/components/option/interfaces';
import { FC, useMemo, useState } from 'react';
import { TemplateThreatStatement } from '../../../customTypes';
import threatStatus from '../../../data/status/threatStatus.json';
import expandablePanelHeaderStyles from '../../../styles/expandablePanelHeader';
import CommentsEdit from '../../generic/CommentsEdit';
import StatusSelector from '../../generic/StatusSelector';
import STRIDESELECTOR from '../../generic/STRIDESelector';
import PriorityEdit from '../PriorityEdit';


export interface MetadataEditorProps {
  variant: ExpandableSectionProps['variant'];
  editingStatement: TemplateThreatStatement;
  onEditStatementStatus: (statement: TemplateThreatStatement, status: string) => void;
  onEditMetadata: (statement: TemplateThreatStatement, key: string, value: string | string[] | undefined) => void;
}

const MetadataEditor: FC<MetadataEditorProps> = ({
  variant,
  editingStatement,
  onEditStatementStatus,
  onEditMetadata,
}) => {
  const [expanded, setExpanded] = useState(false);
  const stride = useMemo(() => {
    return (editingStatement.metadata?.find(m => m.key === 'STRIDE')?.value as string[]) || undefined;
  }, [editingStatement.metadata]);

  return (
    <ExpandableSection
      headerText={<span css={variant === 'default' ? expandablePanelHeaderStyles : undefined}>Metadata</span>}
      headingTagOverride='h3'
      variant={variant}
      expanded={expanded}
      onChange={({ detail }) => setExpanded(detail.expanded)}
    >
      <Grid
        gridDefinition={[
          { colspan: { default: 12, xs: 3 } },
          { colspan: { default: 12, xs: 3 } },
          { colspan: { default: 12, xs: 6 } },
          { colspan: { default: 12, xs: 12 } },
        ]}
      >
        <StatusSelector
          selectedOption={editingStatement.status}
          setSelectedOption={(option) => onEditStatementStatus(editingStatement, option)}
          options={threatStatus as OptionDefinition[]}
        />
        <PriorityEdit
          editingStatement={editingStatement}
          onEditMetadata={onEditMetadata}
        />
        <STRIDESELECTOR
          label='STRIDE'
          selected={stride}
          setSelected={(selected) => onEditMetadata(editingStatement, 'STRIDE', selected)}
        />
        {expanded && <CommentsEdit
          entity={editingStatement}
          onEditEntity={onEditMetadata}
        />}
      </Grid>
    </ExpandableSection>
  );
};

export default MetadataEditor;
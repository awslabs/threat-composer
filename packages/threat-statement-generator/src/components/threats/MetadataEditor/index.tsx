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
import ExpandableSection, { ExpandableSectionProps } from '@cloudscape-design/components/expandable-section';
import Grid from '@cloudscape-design/components/grid';
import { FC, useMemo } from 'react';
import { TemplateThreatStatement } from '../../../customTypes';
import CommentsEdit from '../../generic/CommentsEdit';
import STRIDESELECTOR from '../../generic/STRIDESelector';
import PriorityEdit from '../PriorityEdit';

export interface MetadataEditorProps {
  variant: ExpandableSectionProps['variant'];
  editingStatement: TemplateThreatStatement;
  onEditMetadata: (statement: TemplateThreatStatement, key: string, value: string | string[] | undefined) => void;
}

const MetadataEditor: FC<MetadataEditorProps> = ({
  variant,
  editingStatement,
  onEditMetadata,
}) => {
  const stride = useMemo(() => {
    return (editingStatement.metadata?.find(m => m.key === 'STRIDE')?.value as string[]) || undefined;
  }, [editingStatement.metadata]);

  return (
    <ExpandableSection headerText={<span className={variant === 'default' ? 'threat-statement-generator-metadata-editor-header' : undefined}>Metadata</span>} headingTagOverride='h3' variant={variant}>
      <Grid
        gridDefinition={[
          { colspan: { default: 12, xs: 3 } },
          { colspan: { default: 12, xs: 9 } },
          { colspan: { default: 12, xs: 12 } },
        ]}
      >
        <PriorityEdit
          editingStatement={editingStatement}
          onEditMetadata={onEditMetadata}
        />
        <STRIDESELECTOR
          label='STRIDE'
          selected={stride}
          setSelected={(selected) => onEditMetadata(editingStatement, 'STRIDE', selected)}
        />
        <CommentsEdit
          entity={editingStatement}
          onEditEntity={onEditMetadata}
        />
      </Grid>
    </ExpandableSection>
  );
};

export default MetadataEditor;
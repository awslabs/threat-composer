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
import { EntityBase } from '@aws/threat-composer-core';
import ExpandableSection, { ExpandableSectionProps } from '@cloudscape-design/components/expandable-section';
import Grid from '@cloudscape-design/components/grid';
import expandablePanelHeaderStyles from '../../../styles/expandablePanelHeader';
import CommentsEdit from '../CommentsEdit';

export interface MetadataEditorProps<T> {
  variant: ExpandableSectionProps['variant'];
  entity: T;
  onEditEntity: (entity: T, key: string, value: string | string[] | undefined) => void;
  defaultExpanded?: boolean;
}

const MetadataEditor = <T extends EntityBase>({
  variant,
  entity,
  onEditEntity,
  defaultExpanded,
}: MetadataEditorProps<T>) => {
  return (
    <ExpandableSection
      headerText={<span css={expandablePanelHeaderStyles}>Metadata</span>}
      headingTagOverride='h3'
      variant={variant}
      defaultExpanded={defaultExpanded}
    >
      <Grid
        gridDefinition={[
          { colspan: { default: 12, xs: 12 } },
        ]}
      >
        <CommentsEdit
          entity={entity}
          onEditEntity={onEditEntity}
        />
      </Grid>
    </ExpandableSection>
  );
};

export default MetadataEditor;

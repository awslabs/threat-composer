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
import { ThreatStatementEditor as OriginalThreatStatementEditor, ThreatFieldTypes, useThreatsContext } from '@aws/threat-composer';
import { FC, useEffect } from 'react';

export interface ThreatStatementEditorWithFieldFocusProps {
  onThreatListView?: () => void;
  threatPackId?: string;
  threatPackThreatId?: string;
  initialEditorField?: ThreatFieldTypes;
}

/**
 * Extended version of ThreatStatementEditor that supports focusing on a specific field
 */
const ThreatStatementEditorWithFieldFocus: FC<ThreatStatementEditorWithFieldFocusProps> = ({
  onThreatListView,
  threatPackId,
  threatPackThreatId,
  initialEditorField,
}) => {
  const { setView } = useThreatsContext();

  // Set the editor field when the component mounts
  useEffect(() => {
    if (initialEditorField) {
      // Use a small timeout to ensure the editor is fully mounted
      const timer = setTimeout(() => {
        setView('editor');
      }, 100);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [initialEditorField, setView]);

  return (
    <OriginalThreatStatementEditor
      onThreatListView={onThreatListView}
      threatPackId={threatPackId}
      threatPackThreatId={threatPackThreatId}
    />
  );
};

export default ThreatStatementEditorWithFieldFocus;

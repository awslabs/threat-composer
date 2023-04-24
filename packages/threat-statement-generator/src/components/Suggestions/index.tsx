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
import Button from '@cloudscape-design/components/button';
import ExpandableSection from '@cloudscape-design/components/expandable-section';
import SpaceBetween from '@cloudscape-design/components/space-between';
import TextContent from '@cloudscape-design/components/text-content';
import { FC, useMemo, useCallback, useState } from 'react';
import { ThreatFieldTypes } from '../../customTypes/threatFieldTypes';
import threatFieldData from '../../data/threatFieldData';

import './index.css';

export interface SuggestionsProps {
  suggestions?: string[];
  setEditor: (type: ThreatFieldTypes) => void;
}

const Suggestions: FC<SuggestionsProps> = ({ suggestions, setEditor }) => {
  const [showMoresuggestions, setShowMoresuggestions] = useState(suggestions && suggestions?.length > 2);

  const suggestionGroups = useMemo(() => {
    return suggestions?.reduce((group: { [groupName: string]: string[] }, suggestion: string) => {
      if (suggestion.indexOf('[') === 0) {
        const endIndex = suggestion.indexOf(']');
        const token = suggestion.slice(1, endIndex);
        const content = suggestion.slice(endIndex + 1).trim();
        return {
          ...group,
          [token]: group[token] ? [...group[token], content] : [content],
        };
      }

      return {
        ...group,
        GENERAL: group.GENERAL ? [...group.GENERAL, suggestion] : [suggestion],
      };
    }, {});
  }, [suggestions]);

  const renderSuggestionGroup = useCallback((groups: { [groupName: string]: string[] }, token: string) => {
    const group = groups[token];
    return (<div key={token} className='threat-statement-generator-editor-container-token-selector-suggestion-group'>
      <div className='threat-statement-generator-editor-container-token-selector-suggestion-button-wrapper'>
        <Button variant='link' onClick={() => setEditor(token as ThreatFieldTypes)}>
          {token !== 'GENERAL' && group && threatFieldData[token]?.displayTitle}
        </Button>
      </div>
      <div className='threat-statement-generator-editor-container-token-selector-suggestion'>
        <SpaceBetween direction='vertical' size='xxxs'>
          {group.map((r, index) => <div key={index}>- {r}</div>)}
        </SpaceBetween>
      </div>
    </div>);
  }, [setEditor]);

  if (suggestions && suggestions.length > 0 && suggestionGroups) {
    return (<ExpandableSection headerText={`Suggestions (${suggestions.length})`} defaultExpanded={true}>
      <TextContent>
        <div className='threat-statement-generator-editor-container-token-selector-suggestion-groups'>
          {Object.keys(suggestionGroups)
            .slice(0, showMoresuggestions ? Object.keys(suggestionGroups).length : 2)
            .map((token) => renderSuggestionGroup(suggestionGroups, token))}
        </div>
        {Object.keys(suggestionGroups).length > 2 && (
          <Button
            iconName={showMoresuggestions ? 'treeview-collapse' : 'treeview-expand'}
            onClick={() => setShowMoresuggestions(prev => !prev)}
            variant='link'>
            {showMoresuggestions ? 'Show less suggestions' : 'Show more suggestions'}
          </Button>)}
      </TextContent>
    </ExpandableSection>);
  }

  return null;
};

export default Suggestions;

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
import { Button, Container, Header, SpaceBetween, TextContent, Input, Textarea } from '@cloudscape-design/components';
import { BaseKeyDetail } from '@cloudscape-design/components/internal/events';
import { FC, useCallback } from 'react';

/**
 * Props interface for EntityCreationCard component
 */
export interface EntityCreationCardProps {
  /** Header text for create mode (not shown in edit mode) */
  header?: string;
  /** Current content value */
  content: string;
  /** Callback when content changes */
  onContentChange: (content: string) => void;
  /** Callback when save/add is triggered */
  onSave: () => void;
  /** Callback when reset/cancel is triggered */
  onReset: () => void;
  /** Placeholder text for input */
  placeholder?: string;
  /** Whether the component is disabled */
  disabled?: boolean;
  /** Text for the action button */
  buttonText?: string;
  /** Component mode - create shows header and enter-to-add, edit shows cancel/save buttons */
  mode: 'create' | 'edit';
}

/**
 * EntityCreationCard component for creating and editing brainstorm items
 *
 * Supports two modes:
 * - create: Shows header, input field with enter-to-add functionality
 * - edit: Shows textarea with cancel/save buttons
 */
export const EntityCreationCard: FC<EntityCreationCardProps> = ({
  header,
  content,
  onContentChange,
  onSave,
  onReset,
  placeholder,
  disabled,
  buttonText = 'Add',
  mode,
}) => {
  /**
   * Handle keyboard events for create mode
   * Triggers save when Enter is pressed and content is valid
   */
  const handleKeyDown = useCallback((event: CustomEvent<BaseKeyDetail>) => {
    if (event.detail.key === 'Enter' && content.trim() && !disabled) {
      event.preventDefault();
      onSave();
    }
  }, [content, onSave, disabled]);

  // Edit mode: Show textarea with cancel/save buttons, no header
  if (mode === 'edit') {
    return (
      <Container>
        <SpaceBetween direction="vertical" size="s">
          <Textarea
            placeholder={placeholder || 'Enter content...'}
            value={content}
            onChange={({ detail }) => onContentChange(detail.value)}
            rows={3}
          />
          <SpaceBetween direction="horizontal" size="s">
            <Button onClick={onReset}>Cancel</Button>
            <Button
              variant="primary"
              disabled={disabled || !content.trim()}
              onClick={onSave}
            >
              {buttonText === 'Add' ? 'Save' : buttonText}
            </Button>
          </SpaceBetween>
        </SpaceBetween>
      </Container>
    );
  }

  // Create mode: Show input with header and enter-to-add helper text
  return (
    <Container header={header ? <Header>{header}</Header> : undefined}>
      <SpaceBetween direction="vertical" size="s">
        <Input
          placeholder={placeholder || 'Enter content...'}
          value={content}
          onChange={({ detail }) => onContentChange(detail.value)}
          onKeyDown={handleKeyDown}
        />
        <TextContent>
          <small><i>Press enter to add...</i></small>
        </TextContent>
      </SpaceBetween>
    </Container>
  );
};

export default EntityCreationCard;
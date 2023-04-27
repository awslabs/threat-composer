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
import ButtonDropdown, { ButtonDropdownProps } from '@cloudscape-design/components/button-dropdown';
import { CancelableEventHandler } from '@cloudscape-design/components/internal/events';
import { FC, useCallback } from 'react';

export interface GenericListMoreActionsProps {
  enabledRemoveAll: boolean;
  onRemoveAll: () => void;
}

const GenericListMoreActions: FC<GenericListMoreActionsProps> = ({
  enabledRemoveAll,
  onRemoveAll,
}) => {
  const handleMoreActions: CancelableEventHandler<ButtonDropdownProps.ItemClickDetails> = useCallback(({ detail }) => {
    switch (detail.id) {
      case 'removeAll':
        onRemoveAll?.();
        break;
      default:
        console.log('Unknown action', detail.id);
    }
  }, [
    onRemoveAll,
  ]);
  return <ButtonDropdown
    items={[
      {
        id: 'removeAll',
        text: 'Remove all statements',
        disabled: !enabledRemoveAll,
      },
    ]}
    ariaLabel="More actions"
    variant="icon"
    onItemClick={handleMoreActions}
  />;
};

export default GenericListMoreActions;
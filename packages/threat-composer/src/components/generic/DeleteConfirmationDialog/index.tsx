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
/**
 * A modal dialog that makes users confirm a destructive action, at one of two
 * levels of friction. Two details are load-bearing for existing callers and
 * tests, so check those before changing them:
 *
 *   - The footer buttons carry `aria-label="delete"` and `aria-label="close"`,
 *     which override their visible text for the accessible name. The Playwright
 *     selectors in e2e/fixtures/selectors.ts match on those labels.
 *   - The remaining `props` are spread onto `Modal`, so variant-specific props
 *     such as `label` and `hintText` reach it too.
 */
import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import FormField from '@cloudscape-design/components/form-field';
import Input from '@cloudscape-design/components/input';
import Modal from '@cloudscape-design/components/modal';
import SpaceBetween from '@cloudscape-design/components/space-between';
import {
  ReactNode,
  FC,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

export interface DeleteConfirmationWithFrictionProps {
  variant?: 'friction';
  /**
   * The label of the input field.
   */
  label?: ReactNode;
  /**
   * The placeholder text of the input field.
   */
  placeholderText?: string;
  /**
   * The hint text of the input field.
   */
  hintText?: string;
  /**
   * The confirmation text that is expected from users to type in the input field.
   */
  confirmationText?: string;
}

export interface DeleteConfirmationWithConfirmationProps {
  variant: 'confirmation';
}

export interface DeleteConfirmationBaseProps {
  /**The variant of the Delete Confirmation Dialog*/
  variant?: 'confirmation' | 'friction';
  /**
   * Determines whether the Delete Confirmation Dialog is displayed on the screen. <br/>
   * The Delete Confirmation Dialog is hidden by default. Set this property to true to show it.
   */
  visible?: boolean;
  /**
   * Calls when a user closes the dialog by using the close icon button or clicing the Cancel button.
   */
  onCancelClicked?: () => void;
  /**
   * Calls when a user clicks the Delete button.
   */
  onDeleteClicked?: () => void;
  /**
   * Renders the Delete button as being in a loading state.
   */
  loading?: boolean;
  /**
   * Determines whether the button is enabled. For Delete With Friction Confirmation Dialog, this flag takes effect after the confirmation text is matched.
   * */
  enabled?: boolean;
  /**
   * The title of the Delete Confirmation Dialog.
   */
  title: string;
  /**
   * Content displayed below the title and above the input field.
   */
  children?: ReactNode;
  /**
   * Override the Delete button label.
   */
  deleteButtonText?: string;
}

export type DeleteConfirmationDialogProps = DeleteConfirmationBaseProps &
  (
    | DeleteConfirmationWithConfirmationProps
    | DeleteConfirmationWithFrictionProps
  );

/**
 * A model dialog used to verify users truly intend to perform deletion or some kind of destructive action. <br/>
 * When deleting resources, you can choose between different levels of friction: <b>friction</b> or <b>confirmation</b>.
 * */
const DeleteConfirmationDialog: FC<DeleteConfirmationDialogProps> = ({
  visible = false,
  onDeleteClicked,
  onCancelClicked,
  loading = false,
  enabled = true,
  title,
  children,
  deleteButtonText,
  ...props
}) => {
  const [confirmation, setConfirmation] = useState('');
  const [isMatched, setIsMatched] = useState(props.variant === 'confirmation');
  const confirmationText =
    (props.variant !== 'confirmation' && props.confirmationText) || 'delete';

  const handleDelete = useCallback(() => {
    setConfirmation('');
    onDeleteClicked?.();
  }, [onDeleteClicked]);

  const handleCancel = useCallback(() => {
    setConfirmation('');
    onCancelClicked?.();
  }, [onCancelClicked]);

  const actions = useMemo(
    () => (
      <Box float="right">
        <SpaceBetween direction="horizontal" size="xs">
          <Button ariaLabel="close" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            ariaLabel="delete"
            variant="primary"
            disabled={!enabled || !isMatched || loading}
            loading={loading}
            onClick={handleDelete}
          >
            {deleteButtonText || 'Delete'}
          </Button>
        </SpaceBetween>
      </Box>
    ),
    [deleteButtonText, handleCancel, handleDelete, loading, isMatched, enabled],
  );

  useEffect(() => {
    setIsMatched(
      props.variant === 'confirmation' || confirmationText === confirmation,
    );
  }, [setIsMatched, confirmation, confirmationText, props.variant]);

  return (
    <Modal
      visible={visible}
      header={title}
      footer={actions}
      onDismiss={handleCancel}
      {...props}
    >
      <SpaceBetween direction="vertical" size="s">
        {children}
        {props.variant !== 'confirmation' && (
          <FormField
            label={
              props.label || (
                <>
                  To confirm deletion, type <i>delete</i> below
                </>
              )
            }
            controlId="confirmation"
            constraintText={props.hintText}
          >
            <Input
              type="text"
              placeholder={props.placeholderText || confirmationText}
              value={confirmation}
              onChange={({ detail }) => setConfirmation(detail.value)}
            />
          </FormField>
        )}
      </SpaceBetween>
    </Modal>
  );
};

export default DeleteConfirmationDialog;

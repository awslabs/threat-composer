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
 * The `userEvent` calls below are deliberately not wrapped in `act()`: userEvent
 * v14 already wraps its own interactions, and nesting a second `act()` around
 * them makes React warn that the test environment is not configured for `act`.
 */
import wrapper from '@cloudscape-design/components/test-utils/dom';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DeleteConfirmationDialog from '.';

describe('DeleteConfirmationDialog', () => {
  afterEach(cleanup);

  it('should renders title and children', () => {
    render(
      <DeleteConfirmationDialog title="dialog title">
        information
      </DeleteConfirmationDialog>,
    );
    expect(screen.getByText('dialog title')).toBeInTheDocument();
    expect(screen.getByText('information')).toBeInTheDocument();
  });

  it('should be invisible by default', async () => {
    render(
      <div data-testid="testId">
        <DeleteConfirmationDialog title="dialog title">
          information
        </DeleteConfirmationDialog>
      </div>,
    );

    const element = await screen.findByTestId('testId');
    const modal = wrapper(element).findModal();
    expect(modal?.isVisible).toBeFalsy();
  });

  it('should be visible when visible is true', () => {
    render(
      <DeleteConfirmationDialog
        title="dialog title"
        label="custom label"
        hintText="custom hint text"
        visible
      >
        information
      </DeleteConfirmationDialog>,
    );
    expect(screen.getByText('dialog title')).toBeVisible();
    expect(screen.getByText('information')).toBeVisible();
    expect(screen.getByText('custom label')).toBeVisible();
    expect(screen.getByText('custom hint text')).toBeVisible();
    expect(screen.getByPlaceholderText('delete')).toBeInTheDocument();
  });

  it('should trigger onCancelClicked when clicking the close icon button', async () => {
    const handleClose = vi.fn();
    render(
      <DeleteConfirmationDialog
        title="dialog title"
        visible
        onCancelClicked={handleClose}
      >
        information
      </DeleteConfirmationDialog>,
    );

    await userEvent.click(screen.getAllByRole('button')[0]);

    expect(handleClose).toHaveBeenCalled();
  });

  it('should trigger onCancelClicked when clicking the Cancel button', async () => {
    const handleClose = vi.fn();
    render(
      <DeleteConfirmationDialog
        title="dialog title"
        visible
        onCancelClicked={handleClose}
      >
        information
      </DeleteConfirmationDialog>,
    );

    await userEvent.click(screen.getByText('Cancel'));

    expect(handleClose).toHaveBeenCalled();
  });

  it('should trigger onDeleteClicked when clicking the Delete button', async () => {
    const handleClose = vi.fn();
    const handleDelete = vi.fn();
    render(
      <DeleteConfirmationDialog
        title="dialog title"
        visible
        onCancelClicked={handleClose}
        onDeleteClicked={handleDelete}
        variant="confirmation"
      >
        information
      </DeleteConfirmationDialog>,
    );

    expect(screen.getByText('Delete').parentNode).toBeEnabled();
    await userEvent.click(screen.getByText('Delete'));
    expect(handleDelete).toHaveBeenCalled();
  });

  it('should enable the Delete button when the confirmation text is typed', async () => {
    const handleClose = vi.fn();
    const handleDelete = vi.fn();
    render(
      <DeleteConfirmationDialog
        title="dialog title"
        visible
        onCancelClicked={handleClose}
        onDeleteClicked={handleDelete}
      >
        information
      </DeleteConfirmationDialog>,
    );
    expect(screen.getByText('Delete').parentNode).toBeDisabled();

    await userEvent.type(screen.getByPlaceholderText('delete'), 'del');

    expect(screen.getByText('Delete').parentNode).toBeDisabled();

    await userEvent.type(screen.getByPlaceholderText('delete'), 'ete');

    await waitFor(() =>
      expect(screen.getByText('Delete').parentNode).toBeEnabled(),
    );

    await userEvent.click(screen.getByText('Delete'));
    expect(handleDelete).toHaveBeenCalled();
  });

  it('should use custom confirmation text', async () => {
    const handleClose = vi.fn();
    const handleDelete = vi.fn();
    const customConfirmationText = 'order id';
    render(
      <DeleteConfirmationDialog
        title="dialog title"
        visible
        confirmationText={customConfirmationText}
        onCancelClicked={handleClose}
        onDeleteClicked={handleDelete}
      >
        information
      </DeleteConfirmationDialog>,
    );
    expect(screen.getByText('Delete').parentNode).toBeDisabled();

    await userEvent.type(
      screen.getByPlaceholderText(customConfirmationText),
      customConfirmationText,
    );

    expect(screen.getByText('Delete').parentNode).toBeEnabled();
    await userEvent.click(screen.getByText('Delete'));
    expect(handleDelete).toHaveBeenCalled();
  });

  it('should render loading state when loading is true', async () => {
    render(
      <DeleteConfirmationDialog
        data-testid="testId"
        title="dialog title"
        visible
        loading
      >
        information
      </DeleteConfirmationDialog>,
    );

    await userEvent.type(screen.getByPlaceholderText('delete'), 'delete');

    expect(screen.getByText('Delete').parentNode).toBeDisabled();

    const element = await screen.findByTestId('testId');
    const button = wrapper(element).findButton('[aria-label="delete"]');

    expect(button?.findLoadingIndicator()).not.toBeNull();
  });

  it('should render custom Delete button text', () => {
    const { getByText } = render(
      <DeleteConfirmationDialog title="dialog title" deleteButtonText="Confirm">
        information
      </DeleteConfirmationDialog>,
    );
    expect(getByText('Confirm')).toBeInTheDocument();
  });

  it('should render Delete button disabled when enabled is false', () => {
    const handleClose = vi.fn();
    const handleDelete = vi.fn();
    const { getByText } = render(
      <DeleteConfirmationDialog
        title="dialog title"
        visible
        onCancelClicked={handleClose}
        onDeleteClicked={handleDelete}
        variant="confirmation"
        enabled={false}
      >
        information
      </DeleteConfirmationDialog>,
    );
    expect(getByText('Delete').parentNode).toBeDisabled();
  });
});

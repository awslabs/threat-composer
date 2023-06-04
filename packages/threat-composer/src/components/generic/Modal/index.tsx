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
import Button from '@cloudscape-design/components/button';
import * as awsui from '@cloudscape-design/design-tokens';
import { css } from '@emotion/react';
import { FC, PropsWithChildren, useEffect } from 'react';

const styles = {
  main: css({
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100vw !important',
    height: '100vh',
    background: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    transition: 'opacity 0.2s linear',
  }),
  mainInactive: css({
    opacity: '0',
    zIndex: '-9999',
  }),
  mainActive: css({
    opacity: '1',
    zIndex: '1299',
  }),
  contentContainer: css({
    'maxWidth': '800px',
    'width': '100%',
    'margin': 'auto',
    'position': 'relative',
    'borderRadius': '10px',
    'background': 'rgba(0, 0, 0, 0.75)',
    '@media screen and (max-width: 800px), screen and (max-height: 640px)': {
      borderRadius: '0px',
      width: '100%',
      height: '100%',
    },
  }),
  contentMain: css({
    position: 'relative',
    margin: awsui.spaceScaledL,
    height: '100%',
    maxHeight: 'calc(100vh - 40px)',
  }),
  closeButton: css({
    'position': 'absolute',
    'top': awsui.spaceScaledM,
    'right': awsui.spaceScaledM,
    'color': '#5f6b7a !important',
    'zIndex': '1299',
    '&:hover': {
      color: '#9ba7b6 !important',
    },
  }),
};

export interface ModalProps {
  visible?: boolean;
  onDismiss?: () => void;
}

/** A modal is a pop-up dialog that can be used to prompt a user for confirmation. */
const Modal: FC<PropsWithChildren<ModalProps>> = ({
  visible = false,
  children,
  onDismiss,
}) => {
  useEffect(() => {
    const handleKeyDown = (event: any) => {
      event.key === 'Escape' && onDismiss?.();
    };

    document.addEventListener('keydown', handleKeyDown, false);

    return () => {
      document.removeEventListener('keydown', handleKeyDown, false);
    };
  }, [onDismiss]);

  return (
    <div css={visible ? [styles.main, styles.mainActive] : [styles.main, styles.mainInactive]}>
      <div css={styles.contentContainer}>
        <div css={styles.closeButton}>
          <Button variant='icon' iconName='close' onClick={onDismiss} />
        </div>
        <div css={styles.contentMain}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;

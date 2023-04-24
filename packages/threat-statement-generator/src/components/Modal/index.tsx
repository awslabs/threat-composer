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
import { FC, PropsWithChildren, useEffect } from 'react';

import './index.css';

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
    <div className={visible ? 'threat-statement-generator-modal-main-active' : 'threat-statement-generator-modal-main'}>
      <div className='threat-statement-generator-modal-content-container'>
        <div className='threat-statement-generator-modal-close-button'>
          <Button variant='icon' iconName='close' onClick={onDismiss} />
        </div>
        <div className='threat-statement-generator-modal-content-main'>
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;

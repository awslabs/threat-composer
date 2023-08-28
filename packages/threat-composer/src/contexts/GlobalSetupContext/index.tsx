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
import { FC, PropsWithChildren, useState, useEffect } from 'react';
import useLocalStorageState from 'use-local-storage-state';
import { GlobalSetupContext, useGlobalSetupContext } from './context';
import InfoModal from '../../components/global/InfoModal';
import { LOCAL_STORAGE_KEY_NEW_VISIT_FLAG } from '../../configs/localStorageKeys';
import { ComposerMode, DataExchangeFormat } from '../../customTypes';

import '@cloudscape-design/global-styles/index.css';

export interface GlobalSetupContextProviderProps {
  composerMode?: ComposerMode;
  onPreview?: (content: DataExchangeFormat) => void;
  onPreviewClose?: () => void;
  onImported?: () => void;
  onDefineWorkload?: () => void;
}

const GlobalSetupContextProvider: FC<PropsWithChildren<GlobalSetupContextProviderProps>> = ({
  children,
  composerMode = 'Full',
  onPreview,
  onPreviewClose,
  onImported,
  onDefineWorkload,
}) => {
  const [hasVisitBefore, setHasVisitBefore] = useLocalStorageState<boolean>(LOCAL_STORAGE_KEY_NEW_VISIT_FLAG, {
    defaultValue: false,
  });

  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [showImportUpdate, setShowImportUpdate] = useState(0);

  useEffect(() => {
    if (!hasVisitBefore) {
      composerMode !== 'Full' && setInfoModalVisible(true);
      window.setTimeout(() => setHasVisitBefore(true), 1000);
    }
  }, [hasVisitBefore, composerMode]);

  return (<div>
    <GlobalSetupContext.Provider value={{
      hasVisitBefore,
      composerMode,
      showInfoModal: () => setInfoModalVisible(true),
      onPreview,
      onPreviewClose,
      onImported,
      showImportUpdate,
      onShowImport: () => setShowImportUpdate(prev => prev+1),
      onDefineWorkload,
    }}>
      {children}
      {infoModalVisible && <InfoModal
        visible={infoModalVisible}
        setVisible={setInfoModalVisible}
      />}
    </GlobalSetupContext.Provider></div>);
};

export default GlobalSetupContextProvider;

export {
  useGlobalSetupContext,
};

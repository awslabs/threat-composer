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
import { Mode, Density } from '@cloudscape-design/global-styles';
import { FC, PropsWithChildren, useState, useEffect } from 'react';
import useLocalStorageState from 'use-local-storage-state';
import { GlobalSetupContext, useGlobalSetupContext } from './context';
import { useThemeContext } from '../../components/generic/ThemeProvider';
import InfoModal from '../../components/global/InfoModal';
import { LOCAL_STORAGE_KEY_NEW_VISIT_FLAG } from '../../configs/localStorageKeys';
import { ComposerMode, DataExchangeFormat } from '../../customTypes';
import EventController from '../../utils/EventController';

export interface GlobalSetupContextProviderProps {
  composerMode?: ComposerMode;
  features?: string[];
  onPreview?: (content: DataExchangeFormat) => void;
  onPreviewClose?: () => void;
  onImported?: () => void;
  onDefineWorkload?: () => void;
}

const stringifyWorkspaceData = (data: any) => {
  return JSON.stringify(data, null, 2);
};

const eventController = new EventController();

window.threatcomposer = {
  stringifyWorkspaceData,
  addEventListener: (eventName, eventHandler) =>
    eventController.addEventListener(eventName, eventHandler),
  dispatchEvent: (event) => eventController.dispatchEvent(event),
};

const GlobalSetupContextProvider: FC<PropsWithChildren<GlobalSetupContextProviderProps>> = ({
  children,
  composerMode = 'Full',
  features,
  onPreview,
  onPreviewClose,
  onImported,
  onDefineWorkload,
}) => {
  const [fileImportModalVisible, setFileImportModalVisible] = useState(false);
  const { setTheme, setDensity } = useThemeContext();

  useEffect(() => {
    window.threatcomposer.applyDensity = (density?: string) => {
      setDensity(density === 'compact' ? Density.Compact : Density.Comfortable);
    };

    window.threatcomposer.applyTheme = (theme?: string) => {
      setTheme(theme === 'dark' ? Mode.Dark : Mode.Light);
    };
  }, [setDensity, setTheme]);

  const [hasVisitBefore, setHasVisitBefore] = useLocalStorageState<boolean>(LOCAL_STORAGE_KEY_NEW_VISIT_FLAG, {
    defaultValue: false,
  });

  const [infoModalVisible, setInfoModalVisible] = useState(false);

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
      features,
      showInfoModal: () => setInfoModalVisible(true),
      onPreview,
      onPreviewClose,
      onImported,
      fileImportModalVisible,
      setFileImportModalVisible,
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

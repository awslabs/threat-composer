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
import { ComposerMode, AppMode } from '../../customTypes';
import EventController from '../../utils/EventController';

export interface GlobalSetupContextProviderProps {
  composerMode?: ComposerMode;
  appMode?: AppMode;
  features?: string[];
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
  appMode,
  features,
}) => {
  const [fileImportModalVisible, setFileImportModalVisible] = useState(false);
  const { setTheme, setDensity } = useThemeContext();

  useEffect(() => {
    window.threatcomposer.applyDensity = (density?: string) => {
      setDensity(density === 'compact' ? Density.Compact : Density.Comfortable);
    };

    window.threatcomposer.applyTheme = (newTheme?: string) => {
      setTheme(newTheme === 'dark' ? Mode.Dark : Mode.Light);
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
      appMode,
      features: features || [],
      showInfoModal: () => setInfoModalVisible(true),
      fileImportModalVisible,
      setFileImportModalVisible,
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

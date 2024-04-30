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
import React, { useContext, createContext } from 'react';
import { AppMode, ComposerMode, DataExchangeFormat } from '../../customTypes';

export interface GlobalSetupContextApi {
  hasVisitBefore: boolean;
  showInfoModal: () => void;
  composerMode: ComposerMode;
  appMode: AppMode;
  features?: string[];
  onPreview?: (content: DataExchangeFormat) => void;
  onPreviewClose?: () => void;
  onImported?: () => void;
  onDefineWorkload?: () => void;
  fileImportModalVisible: boolean;
  setFileImportModalVisible: React.Dispatch<React.SetStateAction<boolean>>;
}

const initialState: GlobalSetupContextApi = {
  hasVisitBefore: false,
  composerMode: 'Full',
  appMode: undefined,
  features: [],
  showInfoModal: () => { },
  fileImportModalVisible: false,
  setFileImportModalVisible: () => {},
};

export const GlobalSetupContext = createContext<GlobalSetupContextApi>(initialState);

export const useGlobalSetupContext = () => useContext(GlobalSetupContext);
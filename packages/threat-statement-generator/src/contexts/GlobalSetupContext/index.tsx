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
import React, { FC, PropsWithChildren, useState, useEffect } from 'react';
import useLocalStorageState from 'use-local-storage-state';
import { GlobalSetupContext } from './context';
import InfoModal from '../../components/InfoModal';
import { LOCAL_STORAGE_KEY_NEW_VISIT_FLAG } from '../../configs/localStorageKeys';

const GlobalSetupContextProvider: FC<PropsWithChildren<{}>> = ({
  children,
}) => {
  const [hasVisitBefore, setHasVisitBefore] = useLocalStorageState<boolean>(LOCAL_STORAGE_KEY_NEW_VISIT_FLAG, {
    defaultValue: false,
  });

  const [infoModalVisible, setInfoModalVisible] = useState(false);

  useEffect(() => {
    if (!hasVisitBefore) {
      setInfoModalVisible(true);
      window.setTimeout(() => setHasVisitBefore(true), 1000);
    }
  }, [hasVisitBefore]);

  return (<GlobalSetupContext.Provider value={{
    showInfoModal: () => setInfoModalVisible(true),
  }}>
    {children}
    {infoModalVisible && <InfoModal
      visible={infoModalVisible}
      setVisible={setInfoModalVisible}
    />}
  </GlobalSetupContext.Provider>);
};

export default GlobalSetupContextProvider;

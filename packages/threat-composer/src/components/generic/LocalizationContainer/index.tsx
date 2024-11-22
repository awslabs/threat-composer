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
import { i18n } from 'i18next';
import React, { useState } from 'react';

export interface LanguageContainerProps {
  children?: React.ReactNode;
  i18next: i18n;
}

export const LanguageContainer: React.FC<LanguageContainerProps> = ({
  i18next,
  children,
}) => {
  const [dir, setDir] = useState<'ltr' | 'rtl'>(
    i18next.dir(i18next.resolvedLanguage),
  );
  i18next.on('languageChanged', (lng) => setDir(i18next.dir(lng)));
  return (<div dir={dir}>{children}</div>);
};

export default LanguageContainer;

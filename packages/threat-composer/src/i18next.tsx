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
import i18n from 'i18next';
import React, { useState, useCallback } from 'react';
import {
  useTranslation,
  initReactI18next,
  I18nextProvider,
  UseTranslationResponse,
} from 'react-i18next';
import enLocaleResource from './data/localization/en/localization.json';
import egThreatStatementExamplesData from './data/localization/en/threatStatementExamples.json';
import egThreatStatementFormat from './data/localization/en/threatStatementFormat';
import heLocaleResource from './data/localization/he/localization.json';
import heThreatStatementExamplesData from './data/localization/he/threatStatementExample.json';
import heThreatStatementFormat from './data/localization/he/threatStatementFormat';

// the translations
// (tip move them in a JSON file and import them,
// or even better, manage them separated from your code: https://react.i18next.com/guides/multiple-translation-files)
export const LanguageResources = {
  en: {
    translation: {
      ...enLocaleResource,
      THREAT_STATEMENT_EXAMPLE_DATA: egThreatStatementExamplesData,
      THREAT_STATEMENT_FORMAT: egThreatStatementFormat,
    },
  },
  he: {
    translation: {
      ...heLocaleResource,
      THREAT_STATEMENT_EXAMPLE_DATA: heThreatStatementExamplesData,
      THREAT_STATEMENT_FORMAT: heThreatStatementFormat,
    },
  },
};

export interface LanguageProviderProps {
  children?: React.ReactNode;
  defaultNS?: string | string[];
}

i18n
  .use(initReactI18next)
  .init({
    debug: false,
    react: {
      bindI18n: 'loaded languageChanged',
      bindI18nStore: 'added',
      useSuspense: true,
    },
    resources: LanguageResources,
    fallbackLng: 'en',

    interpolation: {
      escapeValue: false, // react already safes from xss => https://www.i18next.com/translation-function/interpolation#unescape
    },
  })
  .then(() => {
    console.log('i18next init successful');
  })
  .catch((e) => {
    console.log('i18next init failed', e);
  });

export const LanguageProvider: React.FC<LanguageProviderProps> = ({
  children,
}) => {
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
};

export function useReloadedTranslation(): UseTranslationResponse<
string,
undefined
> {
  const { t, i18n: i18next, ready } = useTranslation();
  const [_, updateState] = useState<{}>();
  const forceUpdate = useCallback(() => updateState({}), []);

  i18n.on(
    'languageChanged',
    (lng) => {
      lng === i18next.language && forceUpdate();
      const dir = i18n.dir(lng);
      document.documentElement.dir = dir;
    });

  return { t: t, i18n: i18next, ready: ready } as UseTranslationResponse<
  string,
  undefined
  >;
}


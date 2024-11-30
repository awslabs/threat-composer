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
import { useReloadedTranslation } from '@aws/threat-composer';
import { I18nProvider } from '@cloudscape-design/components/i18n';
import messages from '@cloudscape-design/components/i18n/messages/all.all';
import { FC } from 'react';
import Full from './components/Full';
import Standalone from './components/Standalone';
import getComposerMode from '../../utils/getComposerMode';

/**
 * Demo app for threat-composer
 */
const App: FC = () => {
  const composerMode = getComposerMode();

  console.log('App-ComposerMode', composerMode);
  const { i18n } = useReloadedTranslation();
  console.log('LANG', i18n.language);
  return (
    <I18nProvider locale={i18n.language} messages={[messages]}>
      {composerMode === 'ThreatsOnly' || composerMode === 'EditorOnly' ? (
        <Standalone composeMode={composerMode} />
      ) : (
        <Full />
      )}
    </I18nProvider>
  );
};

export default App;

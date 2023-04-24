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
import TopNavigation, { TopNavigationProps } from '@cloudscape-design/components/top-navigation';
import { applyDensity, applyMode, Density, Mode } from '@cloudscape-design/global-styles';
import { FC, PropsWithChildren, useState, useMemo } from 'react';

import './index.css';

const AppLayout: FC<PropsWithChildren<{}>> = ({ children }) => {
  const [theme, setTheme] = useState('theme.light');
  const [density, setDensity] = useState('density.comfortable');

  const utilities: TopNavigationProps.Utility[] = useMemo(() => [{
    type: 'menu-dropdown',
    iconName: 'settings',
    ariaLabel: 'Settings',
    title: 'Settings',
    items: [{
      id: 'theme',
      text: 'Theme',
      items: [
        {
          id: 'theme.light',
          text: 'Light',
          disabled: theme === 'theme.light',
          disabledReason: 'currently selected',
        },
        {
          id: 'theme.dark',
          text: 'Dark',
          disabled: theme === 'theme.dark',
          disabledReason: 'currently selected',
        },
      ],
    }, {
      id: 'density',
      text: 'Density',
      items: [
        {
          id: 'density.comfortable',
          text: 'Comfortable',
          disabled: density === 'density.comfortable',
          disabledReason: 'currently selected',
        },
        {
          id: 'density.compact',
          text: 'Compact',
          disabled: density === 'density.compact',
          disabledReason: 'currently selected',
        },
      ],
    }],
    onItemClick: (e) => {
      switch (e.detail.id) {
        case 'theme.light':
          applyMode(Mode.Light);
          setTheme('theme.light');
          break;
        case 'theme.dark':
          applyMode(Mode.Dark);
          setTheme('theme.dark');
          break;
        case 'density.comfortable':
          applyDensity(Density.Comfortable);
          setDensity('density.comfortable');
          break;
        case 'density.compact':
          applyDensity(Density.Compact);
          setDensity('density.compact');
          break;
        default:
          break;
      }
    },
  }], [theme, density]);

  return (<>
    <TopNavigation
      identity={{
        href: '#',
        title: 'threat-composer',
      }}
      utilities={utilities}
      i18nStrings={{ overflowMenuTitleText: 'threat-composer', overflowMenuTriggerText: 'threat-composer' }}
    />
    <div className='app-layout-main'>
      <div className='app-layout-content'>
        {children}
      </div>
    </div>
  </>);
};

export default AppLayout;
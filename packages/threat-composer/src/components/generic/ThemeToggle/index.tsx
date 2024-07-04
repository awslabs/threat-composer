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
import Icon from '@cloudscape-design/components/icon';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Toggle from '@cloudscape-design/components/toggle';
import { Mode } from '@cloudscape-design/global-styles';
import { css } from '@emotion/react';
import { useThemeContext } from '../ThemeProvider';

const styles = {
  container: css({
    height: '100%',
    display: 'flex',
    alignItems: 'center',
  }),
  svg: css({
    color: 'grey !important',
    fill: 'grey !important',
  }),
};

const ThemeToggle = () => {
  const { theme, setTheme } = useThemeContext();
  return (<div css={styles.container}>
    <SpaceBetween direction="horizontal" size="xs">
      <Toggle
        onChange={({ detail }) =>
          setTheme(detail.checked ? Mode.Dark : Mode.Light)
        }
        checked={theme === Mode.Dark}
      />
      <Icon svg={<svg focusable="false" aria-hidden="true" viewBox="0 0 24 24" css={styles.svg}>
        <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1"></path>
      </svg>} />
    </SpaceBetween>
  </div>);
};

export default ThemeToggle;
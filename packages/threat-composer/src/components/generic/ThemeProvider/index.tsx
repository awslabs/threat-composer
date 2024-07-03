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
import { applyDensity, applyMode, Density, Mode } from '@cloudscape-design/global-styles';
import { FC, createContext, useState, useEffect, useContext, PropsWithChildren } from 'react';

import '@cloudscape-design/global-styles/index.css';
import useLocalStorageState from 'use-local-storage-state';

export interface ThemeProviderProps {
  theme?: Mode;
  densitiy?: Density;
}

export interface ThemeContextApi {
  theme: Mode;
  density: Density;
  setTheme: React.Dispatch<React.SetStateAction<Mode>>;
  setDensity: React.Dispatch<React.SetStateAction<Density>>;
}

const initialState: ThemeContextApi = {
  theme: Mode.Light,
  density: Density.Comfortable,
  setTheme: () => { },
  setDensity: () => { },
};

const ThemeContext = createContext<ThemeContextApi>(initialState);


const ThemeProvider: FC<PropsWithChildren<ThemeProviderProps>> = ({
  children,
  ...props
}) => {
  const [theme, setTheme] = useLocalStorageState<Mode>('theme', {
    defaultValue: props.theme || Mode.Light,
  });

  const [density, setDensity] = useState<Density>(() => {
    if (props.densitiy === Density.Compact) {
      return Density.Compact;
    }

    return Density.Comfortable;
  });

  useEffect(() => {
    typeof props.theme !== 'undefined' && setTheme(props.theme);
  }, [props.theme]);

  useEffect(() => {
    typeof props.densitiy !== 'undefined' && setDensity(props.densitiy);
  }, [props.densitiy]);

  useEffect(() => {
    applyMode(theme);
  }, [theme]);

  useEffect(() => {
    applyDensity(density);
  }, [density]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        density,
        setTheme,
        setDensity,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export {
  Mode,
  Density,
};

export const useThemeContext = () => useContext(ThemeContext);

export default ThemeProvider;
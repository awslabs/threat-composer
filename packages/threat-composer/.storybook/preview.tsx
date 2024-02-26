import React, { useEffect, useState } from 'react';
import type { Preview } from "@storybook/react";
import { Mode } from '@cloudscape-design/global-styles';
import ThemeProvider from '../src/components/generic/ThemeProvider';

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: "^on[A-Z].*" },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
    backgrounds: {
      default: 'light',
      values: [
        {
          name: 'light',
          value: '#f2f3f3',
        },
        {
          name: 'dark',
          value: '#16191f',
        },
      ],
    },
  },
  decorators: [
    (Story, args) => {
      const [colorMode, setColorMode] = useState('light');

      useEffect(() => {
        const color = args.globals.backgrounds?.value;
        const matchColorMode = color && args.parameters?.backgrounds?.values?.find((v) => v.value === color)?.name;
        matchColorMode && setColorMode(matchColorMode);
      }, [args.globals.backgrounds?.value]);

      return (
        <ThemeProvider theme={colorMode === 'light' ? Mode.Light : Mode.Dark}>
          <Story />
        </ThemeProvider>
      );
    }
  ]
};

export default preview;
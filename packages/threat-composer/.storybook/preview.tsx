import React, { useEffect, useState } from 'react';
import type { Preview } from "@storybook/react";
import { Mode } from '@cloudscape-design/global-styles';
import NorthStarThemeProvider from '@aws-northstar/ui/components/NorthStarThemeProvider';

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
          value: '#ffffff',
        },
        {
          name: 'dark',
          value: '#0f1b2a',
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

      return (<NorthStarThemeProvider theme={colorMode === 'light' ? Mode.Light : Mode.Dark}>
        <Story /></NorthStarThemeProvider>);
    }
  ]
};

export default preview;
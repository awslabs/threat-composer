import React, { useEffect } from 'react';
import type { Preview } from "@storybook/react";
import { applyMode } from '@cloudscape-design/global-styles';

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
      useEffect(() => {
        const color = args.globals.backgrounds?.value;
        const matchColorMode = color && args.parameters?.backgrounds?.values?.find((v) => v.value === color)?.name;
        matchColorMode && applyMode(matchColorMode);
    }, [args.globals.backgrounds?.value]);

      return <Story/>;
    }
  ]
};

export default preview;
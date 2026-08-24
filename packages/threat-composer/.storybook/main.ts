import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|ts|tsx)'],
  // addon-essentials and addon-interactions are gone: Storybook 9 folded their
  // contents (controls, docs, actions, viewport, toolbars, measure, outline,
  // highlight, and the interaction testing runner) into core, and neither
  // package was published past 8.6.14. Removing them is the migration, not a
  // loss of functionality.
  addons: ['@storybook/addon-links'],
  core: {
    disableTelemetry: true,
  },
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  docs: {
    autodocs: 'tag',
  },
};

export default config;

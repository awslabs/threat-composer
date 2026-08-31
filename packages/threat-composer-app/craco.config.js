module.exports = {
  // webpack-dev-server renders compile warnings into a full-viewport iframe
  // overlay (#webpack-dev-server-client-overlay) that sits above the app and
  // swallows pointer events, so Playwright cannot click anything once a warning
  // is emitted. The build currently emits a source-map warning from
  // ace-builds/worker-coffee.js, which is enough to trigger it.
  //
  // Disabling only the client overlay leaves the warnings on stdout, so nothing
  // is hidden from a developer running `yarn dev`; it just stops the overlay
  // intercepting input. Vite has no equivalent overlay-on-warning behaviour, so
  // this goes away with the Vite migration.
  devServer: (config) => ({
    ...config,
    client: {
      ...(config.client || {}),
      overlay: false,
    },
  }),
  webpack: {
    configure: (config, { env }) => ({
      ...config,
      module: {
        ...config.module,
        rules: config.module.rules.map((rule) => {
          if (rule.oneOf instanceof Array) {
            // eslint-disable-next-line no-param-reassign
            rule.oneOf[rule.oneOf.length - 1].exclude = [
              /\.(js|mjs|jsx|cjs|ts|tsx)$/,
              /\.html$/,
              /\.json$/,
            ];
          }
          return rule;
        }),
      },
      optimization: {
        ...config.optimization,
        ...(env === "production"
          ? {
              splitChunks: {
                chunks: "all",
                name: false,
              },
            }
          : {}),
      },
    }),
  },
};

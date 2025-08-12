const { override, addWebpackPlugin } = require("react-app-rewired");
const webpack = require("webpack");

module.exports = function override(config, env) {
  config.optimization.splitChunks = {
    chunks: "all",
    name: false,
  };

  // Add DefinePlugin to inject build constants
  config.plugins.push(
    new webpack.DefinePlugin({
      'process.env.REACT_APP_BUILD_FAMILY_NAME': JSON.stringify(process.env.REACT_APP_BUILD_FAMILY_NAME || 'Unknown'),
      'process.env.REACT_APP_BUILD_TIMESTAMP': JSON.stringify(process.env.REACT_APP_BUILD_TIMESTAMP || new Date().toISOString()),
      'process.env.REACT_APP_BUILD_RANDOM_INDEX': JSON.stringify(process.env.REACT_APP_BUILD_RANDOM_INDEX || '0'),
    })
  );

  return config;
};

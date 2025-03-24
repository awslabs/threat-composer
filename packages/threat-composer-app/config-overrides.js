const { override } = require("react-app-rewired");

module.exports = function override(config, env) {
  config.optimization.splitChunks = {
    chunks: "all",
    name: false,
  };
  return config;
};

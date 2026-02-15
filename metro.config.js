const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Configure for GitHub Pages deployment
config.transformer = {
  ...config.transformer,
  publicPath: '/dutch-smart-memory/_expo/static',
};

module.exports = config;

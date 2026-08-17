const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const projectRoot = __dirname;
// Monorepo root — one level above apps/, contains packages/core and the
// shared node_modules that npm workspaces hoists to.
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch the whole workspace so Metro picks up changes made in packages/core.
config.watchFolders = [workspaceRoot];

// Resolve modules from this project first, then fall back to the hoisted
// workspace root node_modules.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

module.exports = withNativeWind(config, { input: './src/global.css' });

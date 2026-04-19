const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const exclusionList = require('metro-config/src/defaults/exclusionList');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  resolver: {
    // Reduce filesystem watchers on large native/build directories.
    blockList: exclusionList([
      /ios\/Pods\/.*/,
      /ios\/build\/.*/,
      /android\/build\/.*/,
      /android\/app\/build\/.*/,
      /\.git\/.*/,
    ]),
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);

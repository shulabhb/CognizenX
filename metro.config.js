const path = require('path');
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

// Inlined equivalent of metro-config's exclusionList helper, which moved
// behind a "private" export path in newer Metro versions and is no longer
// safe to import directly (see node_modules/metro-config/package.json
// "exports"). This avoids depending on Metro internals that could move
// again without notice.
function exclusionList(additionalExclusions) {
  const escape = pattern => {
    if (pattern instanceof RegExp) {
      return pattern.source.replace(/\/|\\\//g, '\\' + path.sep);
    }
    return pattern
      .replace(/[\-\[\]\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&')
      .replaceAll('/', '\\' + path.sep);
  };
  return new RegExp(
    '(' + additionalExclusions.map(escape).join('|') + ')$',
  );
}

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

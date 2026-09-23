const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const exclusionList = require('metro-config/src/defaults/exclusionList');
const path = require('path');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  resolver: {
    // posthog-react-native imports `@posthog/core/surveys` via package.json
    // "exports". Without this, Release "Bundle React Native code and images"
    // fails with UnableToResolveError.
    unstable_enablePackageExports: true,
    unstable_conditionNames: ['require', 'react-native', 'import'],
    // Reduce filesystem watchers on large native/build directories.
    blockList: exclusionList([
      /ios\/Pods\/.*/,
      /ios\/build\/.*/,
      /android\/build\/.*/,
      /android\/app\/build\/.*/,
      /\.git\/.*/,
    ]),
    resolveRequest: (context, moduleName, platform) => {
      if (moduleName.startsWith('@posthog/core/')) {
        try {
          return {
            type: 'sourceFile',
            filePath: require.resolve(moduleName, {paths: [context.originModulePath, __dirname]}),
          };
        } catch (_) {
          // fall through to default resolver
        }
      }
      return context.resolveRequest(context, moduleName, platform);
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);

const path = require('path');
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const {withSentryConfig} = require('@sentry/react-native/metro');

// Inlined equivalent of metro-config's exclusionList helper, which moved
// behind a "private" export path in newer Metro versions and is no longer
// safe to import directly (see node_modules/metro-config/package.json
// "exports"). P0 originally imported 'metro-config/src/defaults/exclusionList'
// directly, which is exactly the import that breaks under this Metro version
// (ERR_PACKAGE_PATH_NOT_EXPORTED) — this inlined version replaces it.
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
    // posthog-react-native imports `@posthog/core/surveys` via package.json
    // "exports". Without this, Release "Bundle React Native code and images"
    // fails with UnableToResolveError.
    unstable_enablePackageExports: true,
    // Deliberately excludes 'import': Metro bundles everything as CommonJS,
    // so resolving a dual CJS/ESM package (e.g. @babel/runtime) via its
    // 'import' condition pulls in an ESM build whose shape doesn't match
    // what the rest of the CJS bundle expects — causes
    // "_interopRequireDefault is not a function (it is Object)" at startup.
    unstable_conditionNames: ['require', 'react-native'],
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

module.exports = withSentryConfig(mergeConfig(getDefaultConfig(__dirname), config));

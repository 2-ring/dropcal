const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ensure proper platform-specific module resolution
config.resolver.sourceExts = [...config.resolver.sourceExts, 'jsx', 'js', 'ts', 'tsx'];

// Resolve react-native-web only for web platform
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // If we're building for native (android/ios) and the module is react-native-web,
  // resolve to react-native instead
  if (platform !== 'web' && moduleName === 'react-native-web') {
    return context.resolveRequest(
      context,
      'react-native',
      platform
    );
  }

  // Otherwise, use the default resolver
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;

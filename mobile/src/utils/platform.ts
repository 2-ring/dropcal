import { Platform, Dimensions } from 'react-native';

/**
 * Platform detection and utility functions
 */

// Basic platform detection
export const isIOS = Platform.OS === 'ios';
export const isAndroid = Platform.OS === 'android';
export const isWeb = Platform.OS === 'web';
export const isMobile = isIOS || isAndroid;
export const isNative = isMobile;

// Platform version
export const platformVersion = Platform.Version;

// Get platform-specific value
export const platformSelect = <T>(options: {
  ios?: T;
  android?: T;
  web?: T;
  native?: T;
  default?: T;
}): T | undefined => {
  if (isIOS && options.ios !== undefined) {
    return options.ios;
  }
  if (isAndroid && options.android !== undefined) {
    return options.android;
  }
  if (isWeb && options.web !== undefined) {
    return options.web;
  }
  if (isMobile && options.native !== undefined) {
    return options.native;
  }
  return options.default;
};

// Screen dimensions
export const getScreenDimensions = () => {
  const { width, height } = Dimensions.get('window');
  return { width, height };
};

export const getScreenWidth = (): number => {
  return Dimensions.get('window').width;
};

export const getScreenHeight = (): number => {
  return Dimensions.get('window').height;
};

// Device type detection (based on screen size)
export const isTablet = (): boolean => {
  const { width, height } = getScreenDimensions();
  const aspectRatio = Math.max(width, height) / Math.min(width, height);
  const minDimension = Math.min(width, height);

  // Tablets typically have a larger min dimension and aspect ratio closer to 4:3
  return minDimension >= 600 && aspectRatio < 1.6;
};

export const isPhone = (): boolean => {
  return isMobile && !isTablet();
};

// Orientation detection
export const isPortrait = (): boolean => {
  const { width, height } = getScreenDimensions();
  return height >= width;
};

export const isLandscape = (): boolean => {
  return !isPortrait();
};

// iOS specific checks
export const isIOSVersion = (version: number): boolean => {
  if (!isIOS) return false;
  const iosVersion = typeof platformVersion === 'string'
    ? parseInt(platformVersion, 10)
    : platformVersion;
  return iosVersion >= version;
};

// Android specific checks
export const isAndroidVersion = (version: number): boolean => {
  if (!isAndroid) return false;
  const androidVersion = typeof platformVersion === 'number'
    ? platformVersion
    : parseInt(String(platformVersion), 10);
  return androidVersion >= version;
};

// Pixel density
export const getPixelRatio = (): number => {
  return Platform.select({
    ios: 2,
    android: 2,
    default: 1,
  });
};

// Safe area helpers
export const getStatusBarHeight = (): number => {
  return platformSelect({
    ios: isIOSVersion(11) ? 44 : 20,
    android: 0,
    default: 0,
  }) || 0;
};

// Platform-specific styles helper
export const platformStyles = {
  shadow: platformSelect({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    android: {
      elevation: 4,
    },
    default: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
  }),
};

// Default export with all utilities
export const platform = {
  isIOS,
  isAndroid,
  isWeb,
  isMobile,
  isNative,
  version: platformVersion,
  select: platformSelect,
  dimensions: getScreenDimensions,
  width: getScreenWidth,
  height: getScreenHeight,
  isTablet: isTablet(),
  isPhone: isPhone(),
  isPortrait: isPortrait(),
  isLandscape: isLandscape(),
  pixelRatio: getPixelRatio(),
  statusBarHeight: getStatusBarHeight(),
  styles: platformStyles,
};

export default platform;

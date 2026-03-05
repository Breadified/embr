const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Production optimizations
if (process.env.NODE_ENV === 'production') {
  // Enable minification
  config.transformer.minifierConfig = {
    mangle: {
      keep_fnames: true,
    },
    output: {
      ascii_only: true,
      quote_keys: true,
      wrap_iife: true,
    },
    sourceMap: {
      includeSources: false,
    },
    toplevel: false,
    warnings: false,
  };
}

// Enable CSS support for NativeWind
config.transformer.unstable_allowRequireContext = true;

// Optimize asset resolution
config.resolver.assetExts.push('svg', 'bin', 'txt', 'jpg', 'png', 'json');
config.resolver.sourceExts.push('jsx', 'js', 'ts', 'tsx', 'json', 'svg');

// Production build optimization - exclude test files
if (process.env.NODE_ENV === 'production') {
  config.resolver.platforms = ['native', 'ios', 'android'];
  
  // Add resolver for excluding test files in production builds
  const originalResolverResolveAsset = config.resolver.resolveAsset;
  config.resolver.resolveAsset = (dirPath, assetName, extension) => {
    // Skip test files in production builds
    if (assetName.includes('.test') || assetName.includes('.spec') || dirPath.includes('__tests__')) {
      return [];
    }
    return originalResolverResolveAsset(dirPath, assetName, extension);
  };
}

// Apply NativeWind configuration
module.exports = withNativeWind(config, { input: './global.css' });
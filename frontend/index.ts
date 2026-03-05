/**
 * ✅ TYPESCRIPT ENTRY POINT - Robust Legend State Configuration
 * 
 * This TypeScript entry file ensures Legend State configuration runs BEFORE any other code,
 * providing a cleaner, more maintainable solution than side-effect imports.
 * 
 * CRITICAL ORDER:
 * 1. Crypto polyfill (must be first for React Native)
 * 2. Legend State config (must be before any observables)
 * 3. Expo Router entry (starts the app)
 */

// ✅ CRYPTO POLYFILL - MUST BE FIRST
import 'react-native-get-random-values';

// ✅ LEGEND STATE CONFIG - AUTO-LOADED BEFORE ANY COMPONENT
import './config/legendState';

// ✅ DEVELOPMENT TOOLS (only in __DEV__ mode)
if (__DEV__) {
  import('./utils/devTools').catch(err => {
    console.warn('DevTools not available:', err);
  });
}

// ✅ START EXPO ROUTER
import 'expo-router/entry';

console.log('🚀 TypeScript entry point loaded: Crypto polyfill + Legend State + Expo Router');
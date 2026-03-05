// Jest setup for React Native testing

// Mock react-native-reanimated more comprehensively
jest.mock('react-native-reanimated', () => {
  const mockView = 'View';
  const mockAnimated = {
    View: mockView,
    Text: 'Text',
    Image: 'Image',
    ScrollView: 'ScrollView',
    createAnimatedComponent: (Component) => Component,
    
    // Animation functions
    useSharedValue: jest.fn((value) => ({ value })),
    useAnimatedStyle: jest.fn((callback) => {
      try {
        return callback() || {};
      } catch {
        return {};
      }
    }),
    withTiming: jest.fn((value) => value),
    withSpring: jest.fn((value) => value),
    withRepeat: jest.fn((value) => value),
    withSequence: jest.fn((...values) => values[values.length - 1]),
    runOnJS: jest.fn((fn) => fn),
    interpolate: jest.fn((value) => value),
    
    // Easing
    Easing: {
      bezier: jest.fn(),
      ease: jest.fn(),
      exp: jest.fn(),
      linear: jest.fn(),
      inOut: jest.fn(),
      out: jest.fn(),
      in: jest.fn(),
    },
    
    // Extrapolate
    Extrapolate: {
      CLAMP: 'clamp',
      EXTEND: 'extend',
      IDENTITY: 'identity',
    },
    
    // Layout animations
    FadeIn: jest.fn(() => ({})),
    FadeOut: jest.fn(() => ({})),
    SlideInUp: jest.fn(() => ({})),
    SlideOutUp: jest.fn(() => ({})),
    SlideInDown: jest.fn(() => ({})),
    SlideOutDown: jest.fn(() => ({})),
    SlideInLeft: jest.fn(() => ({})),
    SlideOutLeft: jest.fn(() => ({})),
    SlideInRight: jest.fn(() => ({})),
    SlideOutRight: jest.fn(() => ({})),
    ZoomIn: jest.fn(() => ({})),
    ZoomOut: jest.fn(() => ({})),
  };
  
  // Set default export
  mockAnimated.default = mockAnimated;
  
  return mockAnimated;
});

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  getAllKeys: jest.fn(),
  multiGet: jest.fn(),
  multiSet: jest.fn(),
  multiRemove: jest.fn(),
}));

// Mock Expo modules
jest.mock('expo-status-bar', () => ({
  StatusBar: () => null,
}));

// Mock NativeWind and react-native-css-interop
jest.mock('nativewind', () => ({
  styled: (Component) => Component,
}));

// Mock react-native-css-interop for NativeWind
jest.mock('react-native-css-interop', () => ({
  rem: jest.fn((value) => value * 16),
  hairlineWidth: jest.fn(() => 1),
  fontScale: jest.fn(() => 1),
  pixelRatio: jest.fn(() => 2),
  roundToNearestPixel: jest.fn((value) => Math.round(value)),
  
  // Unit observables mock
  createUnitObservables: jest.fn(() => ({
    rem: { get: jest.fn(() => 16) },
    vh: { get: jest.fn(() => 8.12) },
    vw: { get: jest.fn(() => 3.75) },
    hairlineWidth: { get: jest.fn(() => 1) },
    fontScale: { get: jest.fn(() => 1) },
    pixelRatio: { get: jest.fn(() => 2) },
  })),
}));

// Mock react-native-css-interop/src/runtime/native/unit-observables
jest.mock('react-native-css-interop/src/runtime/native/unit-observables', () => ({
  rem: { get: jest.fn(() => 16) },
  vh: { get: jest.fn(() => 8.12) },
  vw: { get: jest.fn(() => 3.75) },
  hairlineWidth: { get: jest.fn(() => 1) },
  fontScale: { get: jest.fn(() => 1) },
  pixelRatio: { get: jest.fn(() => 2) },
}));

// Mock Legend State
jest.mock('@legendapp/state/react', () => ({
  observer: (Component) => Component,
  useObservable: jest.fn(() => {
    const mockState = {
      get: jest.fn(() => ({})),
      set: jest.fn(),
      value: {},
      isExpanded: { 
        get: jest.fn(() => false), 
        set: jest.fn(),
        value: false
      },
      isActive: { 
        get: jest.fn(() => false), 
        set: jest.fn(),
        value: false
      },
      testValue: { 
        get: jest.fn(() => 0), 
        set: jest.fn(),
        value: 0
      },
      autoCollapseTimer: null,
      // Add common component state properties
      currentDuration: {
        get: jest.fn(() => 0),
        set: jest.fn(),
        value: 0
      },
      startTime: {
        get: jest.fn(() => null),
        set: jest.fn(),
        value: null
      },
      endTime: {
        get: jest.fn(() => null),
        set: jest.fn(),
        value: null
      }
    };
    return mockState;
  }),
  useObserve: jest.fn((fn) => {
    // Execute the function to mimic Legend State behavior
    if (typeof fn === 'function') {
      try {
        fn();
      } catch {
        // Ignore errors in test setup
      }
    }
  }),
}));

// Mock Legend State core
jest.mock('@legendapp/state', () => ({
  observable: jest.fn(() => ({
    get: jest.fn(() => ({})),
    set: jest.fn(),
    value: {},
  })),
  observe: jest.fn(),
}));

// Mock React Native TurboModuleRegistry and DeviceInfo
jest.mock('react-native/Libraries/TurboModule/TurboModuleRegistry', () => ({
  get: jest.fn(() => null),
  getEnforcing: jest.fn(() => ({
    addItem: jest.fn(),
    removeItem: jest.fn(),
    show: jest.fn(),
    hide: jest.fn(),
  })),
}));

// Mock DeviceInfo with proper getConstants
jest.mock('react-native/Libraries/Utilities/DeviceInfo', () => ({
  getConstants() {
    return {
      Dimensions: {
        windowPhysicalPixels: {
          width: 375,
          height: 812,
          scale: 2,
          fontScale: 1,
        },
        screenPhysicalPixels: {
          width: 375,
          height: 812,
          scale: 2,
          fontScale: 1,
        },
      },
    };
  },
}));

// Mock NativeDeviceInfo
jest.mock('react-native/src/private/specs_DEPRECATED/modules/NativeDeviceInfo', () => ({
  getConstants: jest.fn(() => ({
    Dimensions: {
      windowPhysicalPixels: {
        width: 375,
        height: 812,
        scale: 2,
        fontScale: 1,
      },
      screenPhysicalPixels: {
        width: 375,
        height: 812,
        scale: 2,
        fontScale: 1,
      },
    },
  })),
}));

// Mock Dimensions properly for NativeWind
jest.mock('react-native/Libraries/Utilities/Dimensions', () => {
  const dimensions = {
    window: { width: 375, height: 812, scale: 2, fontScale: 1 },
    screen: { width: 375, height: 812, scale: 2, fontScale: 1 },
  };
  return {
    get: jest.fn((key) => dimensions[key] || dimensions.window),
    set: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  };
});

// Mock PixelRatio
jest.mock('react-native/Libraries/Utilities/PixelRatio', () => ({
  get: jest.fn(() => 2),
  getFontScale: jest.fn(() => 1),
  getPixelSizeForLayoutSize: jest.fn((size) => size * 2),
  roundToNearestPixel: jest.fn((size) => Math.round(size)),
}));

// Mock StyleSheet
jest.mock('react-native/Libraries/StyleSheet/StyleSheet', () => ({
  create: jest.fn((styles) => styles),
  flatten: jest.fn((styles) => styles),
  compose: jest.fn((style1, style2) => [style1, style2]),
  hairlineWidth: 1,
  absoluteFillObject: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  absoluteFill: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
}));

// Mock React Native components - simplified to avoid conflicts
// Remove this mock to use native RN components in tests

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    rpc: jest.fn(),
    from: jest.fn(() => ({
      select: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    })),
  })),
}));

// Override React Native's StyleSheet mock
const mockStyleSheet = {
  create: jest.fn((styles) => styles),
  flatten: jest.fn((styles) => styles),
  compose: jest.fn((style1, style2) => [style1, style2]),
  hairlineWidth: 1,
  absoluteFillObject: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  absoluteFill: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
};

// Apply StyleSheet mock to React Native (simpler approach)
Object.defineProperty(require('react-native'), 'StyleSheet', {
  get: () => mockStyleSheet,
  enumerable: true,
  configurable: true,
});

Object.defineProperty(require('react-native'), 'PixelRatio', {
  get: () => ({
    get: jest.fn(() => 2),
    getFontScale: jest.fn(() => 1),
    getPixelSizeForLayoutSize: jest.fn((size) => size * 2),
    roundToNearestPixel: jest.fn((size) => Math.round(size)),
  }),
  enumerable: true,
  configurable: true,
});

// Set mock environment variables
process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

// Global test setup
global.__DEV__ = true;

// Set up real timers by default (individual tests can override)
// jest.useFakeTimers();

// Mock console methods to reduce noise but allow error tracking
const originalError = console.error;
const originalWarn = console.warn;
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
  log: jest.fn(),
  // Keep original error for actual test failures
  _originalError: originalError,
  _originalWarn: originalWarn,
};


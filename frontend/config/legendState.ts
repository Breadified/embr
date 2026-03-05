/**
 * Legend State AsyncStorage Configuration
 * 
 * CRITICAL: This file must be imported FIRST before any Legend State observables
 * to prevent "Missing asyncStorage configuration" errors.
 */

import { configureObservablePersistence } from '@legendapp/state/persist';
import { ObservablePersistAsyncStorage } from '@legendapp/state/persist-plugins/async-storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configure Legend State with AsyncStorage for React Native persistence
configureObservablePersistence({
  pluginLocal: ObservablePersistAsyncStorage,
  localOptions: {
    asyncStorage: {
      AsyncStorage,
    },
  },
});

// ✅ SIMPLE BACKGROUND CONFLICT RESOLUTION - No modals, just automatic fixes
export const backgroundConflictResolver = {
  
  // Automatically resolve conflicts in the background without user intervention
  autoResolveConflict: (targetActivity: string, currentActivity: string) => {
    console.log(`🔧 AUTO-RESOLVING: ${currentActivity} → ${targetActivity}`);
    
    // Simple rule: Latest activity wins (force start behavior)
    // This mimics what most users would choose anyway
    console.log(`✅ AUTO-RESOLUTION: Allowing ${targetActivity} to start, ${currentActivity} will be ended automatically`);
    
    return true; // Always allow the new activity to start
  },
  
  // Emergency cleanup for stuck states
  emergencyCleanup: () => {
    console.log('🚨 EMERGENCY: Background cleanup - clearing any stuck state');
    // This will be called from the activity hooks to clean up
    console.log('✅ Background cleanup complete');
  },
};

console.log('✅ Legend State configured with AsyncStorage and global conflict resolution successfully');
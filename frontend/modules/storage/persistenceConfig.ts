// Legend State persistence configuration
import { ObservablePersistAsyncStorage } from '@legendapp/state/persist-plugins/async-storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const persistenceConfig = {
  pluginLocal: ObservablePersistAsyncStorage,
  // AsyncStorage adapter is already configured
};

// Storage keys for different data types
export const STORAGE_KEYS = {
  // Auth
  AUTH_STATE: 'embr_auth_state',
  DEVICE_ID: 'embr_device_id',
  
  // Data
  UNIFIED_DATA: 'embr_unified_data',
  BABIES: 'embr_babies',
  ACTIVITIES: 'embr_activities',
  ACTIVE_SESSIONS: 'embr_active_sessions',
  
  // Settings
  PREFERENCES: 'embr_preferences',
  THEME: 'embr_theme',
  
  // Sync
  SYNC_QUEUE: 'embr_sync_queue',
  LAST_SYNC: 'embr_last_sync',
} as const;

// Helper to clear all app data
export async function clearAllAppData(): Promise<void> {
  const keys = Object.values(STORAGE_KEYS);
  await AsyncStorage.multiRemove(keys);
}

// Helper to get storage info
export async function getStorageInfo(): Promise<{
  totalKeys: number;
  usedKeys: string[];
  sizeEstimate: number;
}> {
  const allKeys = await AsyncStorage.getAllKeys();
  const appKeys = allKeys.filter(key => key.startsWith('embr_'));
  
  // Estimate size (rough)
  let sizeEstimate = 0;
  for (const key of appKeys) {
    const value = await AsyncStorage.getItem(key);
    if (value) {
      sizeEstimate += value.length;
    }
  }
  
  return {
    totalKeys: appKeys.length,
    usedKeys: appKeys,
    sizeEstimate
  };
}
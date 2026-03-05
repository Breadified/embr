// ⚠️ DEVELOPMENT ONLY - Developer Tools and Utilities
// This file should NEVER be included in production builds

import { Alert, DevSettings, Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { generateSeedData } from './seedData';
import { unifiedActivityStore$ } from '../hooks/useUnifiedActivity';
import { unifiedDataStore$ } from '../hooks/useUnifiedData';
import { unifiedAuthState$ } from '../hooks/useUnifiedAuth';

// Only allow in development mode
if (!__DEV__) {
  console.log('DevTools not available in production');
} else {
  console.log('🛠️ DevTools enabled for development');
  
  // Register development tools
  class DevTools {
    private static instance: DevTools;
    private initialized = false;
    
    static getInstance(): DevTools {
      if (!DevTools.instance) {
        DevTools.instance = new DevTools();
      }
      return DevTools.instance;
    }
    
    initialize(): void {
      if (this.initialized || !__DEV__) {
        return;
      }
      
      this.initialized = true;
      
      // Register dev menu items
      this.registerDevMenuItems();
      
      // Register deep link handlers
      this.registerDeepLinkHandlers();
      
      // Register console commands
      this.registerConsoleCommands();
      
      console.log('✅ DevTools initialized');
    }
    
    private registerDevMenuItems(): void {
      // React Native dev menu (shake gesture or Cmd+D/Ctrl+M)
      if (Platform.OS !== 'web' && DevSettings) {
        // Generate seed data option
        DevSettings.addMenuItem('🌱 Generate Test Data (1 week)', () => {
          this.confirmAndGenerateSeedData(1);
        });
        
        DevSettings.addMenuItem('🌱 Generate Test Data (4 weeks)', () => {
          this.confirmAndGenerateSeedData(4);
        });
        
        DevSettings.addMenuItem('🌱 Generate Test Data (8 weeks)', () => {
          this.confirmAndGenerateSeedData(8);
        });
        
        // Clear all data option
        DevSettings.addMenuItem('🗑️ Clear All Data', () => {
          this.confirmAndClearAllData();
        });
        
        // Show current state
        DevSettings.addMenuItem('📊 Show App State', () => {
          this.showAppState();
        });
        
        // Force sync
        DevSettings.addMenuItem('🔄 Force Sync', () => {
          this.forceSync();
        });
        
        console.log('📱 Dev menu items registered (shake device to access)');
      }
    }
    
    private registerDeepLinkHandlers(): void {
      // Listen for deep links
      Linking.addEventListener('url', this.handleDeepLink);
      
      // Check if app was opened with a deep link
      Linking.getInitialURL().then(url => {
        if (url) {
          this.handleDeepLink({ url });
        }
      });
      
      console.log('🔗 Deep link handlers registered');
      console.log('   Use: expo://localhost:8081/--/seed-data');
      console.log('   Use: expo://localhost:8081/--/clear-data');
      console.log('   Use: expo://localhost:8081/--/show-state');
    }
    
    private handleDeepLink = (event: { url: string }): void => {
      if (!__DEV__) return;
      
      const { path, queryParams } = Linking.parse(event.url);
      console.log('🔗 Deep link received:', path, queryParams);
      
      // Handle different dev commands
      switch (path) {
        case '--/seed-data':
        case 'seed-data': {
          const weeks = queryParams?.weeks ? parseInt(queryParams.weeks as string) : 8;
          this.confirmAndGenerateSeedData(weeks);
          break;
        }
          
        case '--/clear-data':
        case 'clear-data':
          this.confirmAndClearAllData();
          break;
          
        case '--/show-state':
        case 'show-state':
          this.showAppState();
          break;
          
        case '--/force-sync':
        case 'force-sync':
          this.forceSync();
          break;
          
        default:
          // Not a dev command, ignore
          break;
      }
    };
    
    private registerConsoleCommands(): void {
      // Make functions available in console
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const globalAny = global as any;
      
      // Seed data generation
      globalAny.seedData = (weeks?: number) => {
        this.confirmAndGenerateSeedData(weeks || 8);
      };
      
      // Clear data
      globalAny.clearData = () => {
        this.confirmAndClearAllData();
      };
      
      // Show state
      globalAny.showState = () => {
        this.showAppState();
      };
      
      // Force sync
      globalAny.forceSync = () => {
        this.forceSync();
      };
      
      // Quick access to stores
      globalAny.stores = {
        activity: unifiedActivityStore$,
        data: unifiedDataStore$,
        auth: unifiedAuthState$,
      };
      
      console.log('🖥️ Console commands registered:');
      console.log('   seedData(weeks) - Generate test data');
      console.log('   clearData() - Clear all data');
      console.log('   showState() - Show app state');
      console.log('   forceSync() - Force sync');
      console.log('   stores - Access to Legend State stores');
    }
    
    private confirmAndGenerateSeedData(weeks: number): void {
      Alert.alert(
        '🌱 Generate Test Data',
        `This will generate ${weeks} week(s) of test activity data. Existing data will be cleared.\n\nContinue?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Generate',
            style: 'destructive',
            onPress: async () => {
              try {
                await generateSeedData(weeks);
              } catch (error) {
                console.error('Failed to generate seed data:', error);
              }
            }
          }
        ]
      );
    }
    
    private confirmAndClearAllData(): void {
      Alert.alert(
        '🗑️ Clear All Data',
        'This will delete all local data including babies and activities.\n\nThis action cannot be undone!',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Clear All',
            style: 'destructive',
            onPress: () => {
              this.clearAllData();
            }
          }
        ]
      );
    }
    
    private clearAllData(): void {
      console.log('🗑️ Clearing all data...');
      
      // Clear activity data
      unifiedActivityStore$.sessions.set({});
      unifiedActivityStore$.activeSessions.set({});
      unifiedActivityStore$.globalActiveSession.set(null);
      unifiedActivityStore$.sessionConflicts.set([]);
      unifiedActivityStore$.syncQueue.set([]);
      unifiedActivityStore$.lastSyncTime.set(null);
      unifiedActivityStore$.error.set(null);
      unifiedActivityStore$.syncError.set(null);
      
      // Clear baby data
      unifiedDataStore$.babies.set({});
      unifiedDataStore$.activeBabyId.set(null);
      unifiedDataStore$.syncQueue.set([]);
      unifiedDataStore$.lastSyncTime.set(null);
      unifiedDataStore$.error.set(null);
      unifiedDataStore$.syncError.set(null);
      
      Alert.alert('✅ Data Cleared', 'All local data has been removed');
      console.log('✅ All data cleared');
    }
    
    private showAppState(): void {
      const activityState = unifiedActivityStore$.peek();
      const dataState = unifiedDataStore$.peek();
      const authState = unifiedAuthState$.peek();
      
      const sessionCount = Object.keys(activityState.sessions).length;
      const activeSessionCount = Object.keys(activityState.activeSessions).length;
      const babyCount = Object.keys(dataState.babies).length;
      
      const stateInfo = `
📊 APP STATE
      
Auth:
- Type: ${authState.authType}
- Online: ${authState.isOnline}
- User: ${authState.user?.email || 'None'}
- Device ID: ${authState.deviceId?.substring(0, 8)}...

Data:
- Babies: ${babyCount}
- Active Baby: ${dataState.activeBabyId?.substring(0, 8) || 'None'}...
- Sync Queue: ${dataState.syncQueue.length} items

Activities:
- Total Sessions: ${sessionCount}
- Active Sessions: ${activeSessionCount}
- Global Active: ${activityState.globalActiveSession?.activity_type || 'None'}
- Sync Queue: ${activityState.syncQueue.length} items
      `.trim();
      
      Alert.alert('App State', stateInfo, [{ text: 'OK' }]);
      console.log(stateInfo);
    }
    
    private forceSync(): void {
      console.log('🔄 Forcing sync...');
      
      // Trigger sync for both stores
      const activitySyncQueue = unifiedActivityStore$.syncQueue.peek();
      const dataSyncQueue = unifiedDataStore$.syncQueue.peek();
      
      if (activitySyncQueue.length === 0 && dataSyncQueue.length === 0) {
        Alert.alert('No Sync Needed', 'There are no items in the sync queue');
        return;
      }
      
      // Set syncing flags
      unifiedActivityStore$.isSyncing.set(true);
      unifiedDataStore$.isSyncing.set(true);
      
      Alert.alert(
        'Sync Started',
        `Syncing ${activitySyncQueue.length} activities and ${dataSyncQueue.length} data items`,
        [{ text: 'OK' }]
      );
      
      // Reset after a delay (simulating sync)
      setTimeout(() => {
        unifiedActivityStore$.isSyncing.set(false);
        unifiedDataStore$.isSyncing.set(false);
        console.log('✅ Sync simulation complete');
      }, 2000);
    }
  }
  
  // Auto-initialize DevTools in development
  const devTools = DevTools.getInstance();
  
  // Initialize after a short delay to ensure app is ready
  setTimeout(() => {
    devTools.initialize();
  }, 1000);
  
  // Export for manual use if needed
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).DevTools = DevTools;
}
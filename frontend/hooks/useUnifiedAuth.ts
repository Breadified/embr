import { useState, useEffect, useCallback } from 'react';
import { observable } from '@legendapp/state';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { AuthService } from '../services/authService';
import type { User } from '@supabase/supabase-js';

// Unified auth state - single source of truth
export interface UnifiedAuthState {
  // Core state
  isOnline: boolean;
  networkState: 'unknown' | 'online' | 'offline';
  authType: 'checking' | 'needsWelcome' | 'anon' | 'authenticated';
  
  // User data
  user: User | null;
  deviceId: string | null;
  
  // Computed flags - these drive all sync decisions
  shouldSync: boolean;        // online + authenticated
  shouldUseRealtime: boolean; // shouldSync + stable connection
  canUseLocalOnly: boolean;   // anon or offline
  
  // Status tracking
  isInitializing: boolean;
  lastSyncCheck: number | null;
  syncQueueSize: number;
  error: string | null;
}

// Observable unified auth state - accessible everywhere
export const unifiedAuthState$ = observable<UnifiedAuthState>({
  isOnline: false,
  networkState: 'unknown',
  authType: 'checking',
  user: null,
  deviceId: null,
  shouldSync: false,
  shouldUseRealtime: false,
  canUseLocalOnly: false,
  isInitializing: true,
  lastSyncCheck: null,
  syncQueueSize: 0,
  error: null,
});

// Device ID and choice management
const DEVICE_ID_KEY = 'embr_device_id';
const AUTH_TOKEN_KEY = 'embr_auth_token';
const USER_CHOICE_KEY = 'embr_user_auth_choice'; // 'skip' | 'never_asked' | 'authenticated'

class UnifiedAuthManager {
  private networkUnsubscribe: (() => void) | null = null;
  private authUnsubscribe: (() => void) | null = null;
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;

  async initialize(): Promise<void> {
    // Prevent multiple initializations
    if (this.isInitialized) {
      console.log('🔄 Auth manager already initialized, skipping...');
      return;
    }
    
    if (this.initializationPromise) {
      console.log('🔄 Auth manager initialization in progress, waiting...');
      return this.initializationPromise;
    }

    this.initializationPromise = this._doInitialize();
    return this.initializationPromise;
  }

  private async _doInitialize(): Promise<void> {
    try {
      console.log('🏆 Initializing Unified Auth System...');
      
      // 1. Setup network monitoring
      this.setupNetworkMonitoring();
      
      // 2. Get or create device ID
      const deviceId = await this.getOrCreateDeviceId();
      unifiedAuthState$.deviceId.set(deviceId);
      
      // 3. Check authentication state
      await this.checkAuthenticationState();
      
      // 4. Setup auth state monitoring
      this.setupAuthMonitoring();
      
      this.isInitialized = true;
      unifiedAuthState$.isInitializing.set(false);
      console.log('✅ Unified Auth System Ready!');
      
    } catch (error) {
      console.error('❌ Failed to initialize unified auth:', error);
      unifiedAuthState$.error.set(
        error instanceof Error ? error.message : 'Initialization failed'
      );
      unifiedAuthState$.isInitializing.set(false);
    }
  }

  private async getOrCreateDeviceId(): Promise<string> {
    try {
      let deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
      const userChoice = await AsyncStorage.getItem(USER_CHOICE_KEY);
      
      if (!deviceId) {
        // Generate new device ID
        deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
        console.log('📱 Created new device ID:', deviceId);
        
        // Mark as never asked since this is a new device
        if (!userChoice) {
          await AsyncStorage.setItem(USER_CHOICE_KEY, 'never_asked');
        }
      } else {
        console.log('📱 Found existing device ID:', deviceId);
        
        // If device ID exists but no user choice recorded, mark as never asked
        // This handles the upgrade case where existing users get the new welcome flow
        if (!userChoice) {
          console.log('🔄 Existing device ID without user choice - marking as never asked');
          await AsyncStorage.setItem(USER_CHOICE_KEY, 'never_asked');
        }
      }
      
      return deviceId;
    } catch (error) {
      console.warn('⚠️ Failed to manage device ID, using temporary:', error);
      return `temp_${Date.now()}`;
    }
  }

  private async checkAuthenticationState(): Promise<void> {
    try {
      // Check for existing user session
      const currentUser = await AuthService.getCurrentUser();
      
      if (currentUser) {
        // User is authenticated
        console.log('✅ Found authenticated user:', currentUser.id);
        unifiedAuthState$.user.set(currentUser);
        unifiedAuthState$.authType.set('authenticated');
        // Store that they chose authentication
        await AsyncStorage.setItem(USER_CHOICE_KEY, 'authenticated');
      } else {
        // Check if we have a stored auth token (for offline scenarios)
        const storedToken = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
        
        if (storedToken) {
          // We have a token but no active session (offline authenticated)
          console.log('📱 Found stored auth token (offline)');
          unifiedAuthState$.authType.set('authenticated');
        } else {
          // Check user's previous authentication choice
          const userChoice = await AsyncStorage.getItem(USER_CHOICE_KEY);
          const deviceId = unifiedAuthState$.deviceId.peek();
          
          if (userChoice === 'skip' && deviceId) {
            // User previously chose to skip - they're anonymous by choice
            console.log('👤 User chose anonymous mode with device ID');
            unifiedAuthState$.authType.set('anon');
          } else if (deviceId && userChoice === 'never_asked') {
            // Device ID exists but user was never asked - show welcome
            console.log('🎯 Device ID exists, but user needs welcome screen');
            unifiedAuthState$.authType.set('needsWelcome');
          } else if (!deviceId && !userChoice) {
            // First time user - needs to see welcome screen
            console.log('🆕 New user - needs welcome screen');
            unifiedAuthState$.authType.set('needsWelcome');
          } else {
            // Fallback case
            console.log('❓ Unclear auth state - showing welcome');
            unifiedAuthState$.authType.set('needsWelcome');
          }
        }
      }
      
      // Update computed flags
      this.updateComputedFlags();
      
    } catch (error) {
      console.error('❌ Failed to check auth state:', error);
      // Fallback to welcome screen for safety
      unifiedAuthState$.authType.set('needsWelcome');
      this.updateComputedFlags();
    }
  }

  private setupNetworkMonitoring(): void {
    // Clean up existing listener first
    if (this.networkUnsubscribe) {
      this.networkUnsubscribe();
    }

    this.networkUnsubscribe = NetInfo.addEventListener(state => {
      const isOnline = state.isConnected && state.isInternetReachable;
      const networkState = state.isConnected === null 
        ? 'unknown' 
        : (isOnline ? 'online' : 'offline');

      console.log(`🌐 Network state changed: ${networkState}`);
      
      unifiedAuthState$.isOnline.set(isOnline || false);
      unifiedAuthState$.networkState.set(networkState);
      
      // Update computed flags when network changes
      this.updateComputedFlags();
      
      // If we just came online and should sync, update sync check time
      if (isOnline && unifiedAuthState$.shouldSync.peek()) {
        unifiedAuthState$.lastSyncCheck.set(Date.now());
      }
    });
  }

  private setupAuthMonitoring(): void {
    // Clean up existing listener first
    if (this.authUnsubscribe) {
      this.authUnsubscribe();
    }

    const authListener = AuthService.onAuthStateChange((user) => {
      console.log('🔄 Auth state changed:', user?.id || 'signed out');
      
      const currentAuthType = unifiedAuthState$.authType.peek();
      
      unifiedAuthState$.user.set(user);
      
      if (user) {
        // User successfully authenticated
        unifiedAuthState$.authType.set('authenticated');
        // Store auth token for offline scenarios
        AsyncStorage.setItem(AUTH_TOKEN_KEY, 'authenticated').catch(console.warn);
        AsyncStorage.setItem(USER_CHOICE_KEY, 'authenticated').catch(console.warn);
      } else {
        // User signed out - BUT don't trigger re-initialization loop!
        // Check if this is a manual sign out vs initial state check
        if (currentAuthType === 'authenticated') {
          // This is a manual sign out - clear choices and go to welcome
          console.log('🚪 Manual sign out detected - clearing user choices');
          AsyncStorage.removeItem(AUTH_TOKEN_KEY).catch(console.warn);
          AsyncStorage.removeItem(USER_CHOICE_KEY).catch(console.warn);
          unifiedAuthState$.authType.set('needsWelcome');
        } else {
          // This might be an initial state check - don't override current logic
          console.log('🔍 Auth state check - maintaining current auth flow');
        }
      }
      
      this.updateComputedFlags();
    });
    
    this.authUnsubscribe = () => {
      authListener?.data?.subscription?.unsubscribe();
    };
  }

  private updateComputedFlags(): void {
    const state = {
      isOnline: unifiedAuthState$.isOnline.peek(),
      authType: unifiedAuthState$.authType.peek(),
    };

    // Core computed flags
    const shouldSync = state.isOnline && state.authType === 'authenticated';
    const shouldUseRealtime = shouldSync; // Can add more conditions later
    const canUseLocalOnly = state.authType === 'anon' || !state.isOnline;

    // Update observable state
    unifiedAuthState$.shouldSync.set(shouldSync);
    unifiedAuthState$.shouldUseRealtime.set(shouldUseRealtime);
    unifiedAuthState$.canUseLocalOnly.set(canUseLocalOnly);

    console.log('🎯 Auth flags updated:', {
      authType: state.authType,
      isOnline: state.isOnline,
      shouldSync,
      shouldUseRealtime,
      canUseLocalOnly,
    });
  }

  // Authentication actions
  async signInWithEmail(email: string, password: string): Promise<User> {
    const result = await AuthService.signIn(email, password);
    return result.user!; // AuthService throws if no user
  }

  async signInWithProvider(provider: 'google' | 'apple' | 'github' | 'facebook'): Promise<void> {
    await AuthService.signInWithProvider(provider);
    // User state will be updated via the auth listener
  }

  async signInAnonymously(): Promise<User> {
    const user = await AuthService.createAnonymousSession();
    return user;
  }

  async signOut(): Promise<void> {
    console.log('🚪 Initiating sign out...');
    await AuthService.signOut();
    // Note: User choice and state will be updated via the auth listener
    // No need to manually set state here - prevents circular updates
  }

  // New methods for handling user welcome choices
  async chooseSkipForNow(): Promise<void> {
    console.log('👤 User chose to skip authentication for now');
    
    // Ensure device ID exists
    const deviceId = unifiedAuthState$.deviceId.peek() || await this.getOrCreateDeviceId();
    unifiedAuthState$.deviceId.set(deviceId);
    
    // Store user choice
    await AsyncStorage.setItem(USER_CHOICE_KEY, 'skip');
    
    // Update auth type
    unifiedAuthState$.authType.set('anon');
    this.updateComputedFlags();
  }

  async chooseAuthentication(): Promise<void> {
    console.log('🔐 User chose to authenticate');
    
    // Store user choice
    await AsyncStorage.setItem(USER_CHOICE_KEY, 'never_asked');
    
    // This will lead to auth screen being shown
    // The actual auth will be handled by signInWithEmail/signInWithProvider
  }

  // Cleanup
  destroy(): void {
    console.log('🧹 Cleaning up auth manager...');
    if (this.networkUnsubscribe) {
      this.networkUnsubscribe();
      this.networkUnsubscribe = null;
    }
    if (this.authUnsubscribe) {
      this.authUnsubscribe();
      this.authUnsubscribe = null;
    }
    this.isInitialized = false;
    this.initializationPromise = null;
  }
}

// Singleton manager instance
let authManager: UnifiedAuthManager | null = null;

const getAuthManager = (): UnifiedAuthManager => {
  if (!authManager) {
    authManager = new UnifiedAuthManager();
  }
  return authManager;
};

// Main hook for unified authentication
export const useUnifiedAuth = () => {
  const [isReady, setIsReady] = useState(false);

  // Initialize on first use - with proper singleton management
  useEffect(() => {
    let mounted = true;
    
    const initializeAuth = async () => {
      try {
        const manager = getAuthManager();
        await manager.initialize();
        if (mounted) {
          setIsReady(true);
        }
      } catch (error) {
        console.error('❌ Failed to initialize auth in hook:', error);
        if (mounted) {
          setIsReady(true); // Still set ready to avoid infinite loading
        }
      }
    };

    if (!isReady) {
      initializeAuth();
    }

    // Cleanup function
    return () => {
      mounted = false;
    };
  }, [isReady]);

  // Only destroy on app-level unmount, not component unmount
  useEffect(() => {
    return () => {
      // This cleanup only runs when the entire app unmounts
      // Don't destroy on individual component unmounts to prevent re-initialization
    };
  }, []);

  // Authentication actions
  const signInWithEmail = useCallback(async (email: string, password: string) => {
    return getAuthManager().signInWithEmail(email, password);
  }, []);

  const signInWithProvider = useCallback(async (provider: 'google' | 'apple' | 'github' | 'facebook') => {
    return getAuthManager().signInWithProvider(provider);
  }, []);

  const signInAnonymously = useCallback(async () => {
    return getAuthManager().signInAnonymously();
  }, []);

  const signOut = useCallback(async () => {
    return getAuthManager().signOut();
  }, []);

  // Welcome screen choice actions
  const chooseSkipForNow = useCallback(async () => {
    return getAuthManager().chooseSkipForNow();
  }, []);

  const chooseAuthentication = useCallback(async () => {
    return getAuthManager().chooseAuthentication();
  }, []);

  // Return current auth state (reactive via Legend State)
  return {
    // State (automatically reactive)
    isOnline: unifiedAuthState$.isOnline.get(),
    networkState: unifiedAuthState$.networkState.get(),
    authType: unifiedAuthState$.authType.get(),
    user: unifiedAuthState$.user.get(),
    deviceId: unifiedAuthState$.deviceId.get(),
    
    // Computed flags (the magic that eliminates complexity)
    shouldSync: unifiedAuthState$.shouldSync.get(),
    shouldUseRealtime: unifiedAuthState$.shouldUseRealtime.get(),
    canUseLocalOnly: unifiedAuthState$.canUseLocalOnly.get(),
    
    // Status
    isInitializing: unifiedAuthState$.isInitializing.get(),
    isReady,
    error: unifiedAuthState$.error.get(),
    
    // Actions
    signInWithEmail,
    signInWithProvider,
    signInAnonymously,
    signOut,
    chooseSkipForNow,
    chooseAuthentication,
    
    // Advanced computed helpers
    get needsWelcome() {
      return unifiedAuthState$.authType.get() === 'needsWelcome';
    },
    
    get needsAuthentication() {
      const authType = unifiedAuthState$.authType.get();
      return authType === 'needsWelcome'; // Show auth after welcome choice
    },
    
    get isAnonymous() {
      return unifiedAuthState$.authType.get() === 'anon';
    },
    
    get isAuthenticated() {
      return unifiedAuthState$.authType.get() === 'authenticated';
    },
  };
};
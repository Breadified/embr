// ✅ Legend State configuration auto-loaded via entry point - no manual import needed

// useUnifiedAuth - Unified authentication hook for the championship architecture
// This hook handles all authentication states seamlessly as per CLAUDE.md requirements

import { useState, useEffect } from 'react';
import { observable } from '@legendapp/state';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabase';
import type { User, Session } from '@supabase/supabase-js';
import 'react-native-get-random-values'; // CRITICAL: Crypto polyfill must be imported first
import { nanoid } from 'nanoid';

// Auth types for the unified architecture
export type AuthType = 'offline_no_device' | 'offline_anon_device' | 'offline_auth_device' | 'online_auth_user';

// Device ID storage key
const DEVICE_ID_KEY = 'embr_device_id';

// Auth state interface
export interface AuthState {
  // Core authentication state
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isReady: boolean;
  isInitializing: boolean;
  deviceId: string | null;
  
  // Network state
  isOnline: boolean;
  
  // Computed auth type - one of the 4 sacred states from CLAUDE.md
  authType: AuthType;
  
  // UI state flags
  needsWelcome: boolean;
  error: string | null;
  
  // Computed flags - eliminate ALL branching logic in components
  shouldSync: boolean;        // true = online + authenticated  
  shouldUseRealtime: boolean; // true = should sync + stable connection
  canUseLocalOnly: boolean;   // true = anonymous or offline
  needsAuthentication: boolean; // true = requires auth flow
  isAuthenticated: boolean;   // true = user logged in
  isAnonymous: boolean;      // true = using device ID only
  
  // Auth actions
  signInWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUpWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  ensureDeviceId: () => Promise<string>;
}

// Global auth state - observable for reactivity
export const unifiedAuthState$ = observable<Omit<AuthState, 'signInWithEmail' | 'signUpWithEmail' | 'signOut' | 'ensureDeviceId'>>({
  user: null,
  session: null,
  isLoading: true,
  isReady: false,
  isInitializing: true,
  deviceId: null,
  isOnline: false,
  authType: 'offline_no_device',
  needsWelcome: true,
  error: null,
  shouldSync: false,
  shouldUseRealtime: false,
  canUseLocalOnly: true,
  needsAuthentication: false,
  isAuthenticated: false,
  isAnonymous: false,
});

// Network detection
let networkCheckInterval: NodeJS.Timeout | null = null;

// Initialize network monitoring
const initializeNetworkMonitoring = () => {
  // Simple network check for React Native
  const checkNetwork = async () => {
    try {
      const response = await fetch('https://www.google.com/', { 
        method: 'HEAD',
        // TypeScript-safe timeout implementation
        signal: AbortSignal.timeout ? AbortSignal.timeout(5000) : undefined
      });
      const isOnline = response.ok;
      
      if (unifiedAuthState$.isOnline.peek() !== isOnline) {
        console.log('🌐 Network status changed:', isOnline ? 'ONLINE' : 'OFFLINE');
        unifiedAuthState$.isOnline.set(isOnline);
        updateComputedStates();
      }
    } catch (error) {
      // Use error variable to avoid unused warning
      console.warn('Network check failed:', error);
      if (unifiedAuthState$.isOnline.peek() !== false) {
        console.log('🌐 Network status changed: OFFLINE (error)');
        unifiedAuthState$.isOnline.set(false);
        updateComputedStates();
      }
    }
  };
  
  // Check network immediately
  checkNetwork();
  
  // Check every 10 seconds
  if (networkCheckInterval) clearInterval(networkCheckInterval);
  networkCheckInterval = setInterval(checkNetwork, 10000);
};

// Update computed auth states based on current conditions
const updateComputedStates = () => {
  const user = unifiedAuthState$.user.peek();
  const session = unifiedAuthState$.session.peek();
  const deviceId = unifiedAuthState$.deviceId.peek();
  const isOnline = unifiedAuthState$.isOnline.peek();
  
  // Determine auth type - the 4 sacred states from CLAUDE.md
  let authType: AuthType;
  if (!isOnline && !deviceId) {
    authType = 'offline_no_device';
  } else if (!isOnline && deviceId && !session) {
    authType = 'offline_anon_device';
  } else if (!isOnline && deviceId && session) {
    authType = 'offline_auth_device';  
  } else if (isOnline && session && user) {
    authType = 'online_auth_user';
  } else {
    authType = 'offline_no_device';
  }
  
  // Compute flags that eliminate branching logic
  const isAuthenticated = !!(user && session);
  const isAnonymous = !!deviceId && !isAuthenticated;
  const shouldSync = isOnline && isAuthenticated;
  const shouldUseRealtime = shouldSync; // Could add connection stability check
  const canUseLocalOnly = !isAuthenticated || !isOnline;
  const needsAuthentication = !isAuthenticated && isOnline;
  const needsWelcome = !deviceId && !isAuthenticated;
  
  // Update all computed states at once
  unifiedAuthState$.assign({
    authType,
    isAuthenticated,
    isAnonymous,
    shouldSync,
    shouldUseRealtime,
    canUseLocalOnly,
    needsAuthentication,
    needsWelcome,
  });
  
  console.log('🔐 Auth state updated:', {
    authType,
    isAuthenticated,
    isAnonymous,
    shouldSync,
    isOnline,
    hasDeviceId: !!deviceId,
    hasUser: !!user,
    needsWelcome,
  });
};

// Device ID management
const ensureDeviceId = async (): Promise<string> => {
  let deviceId = unifiedAuthState$.deviceId.peek();
  
  if (!deviceId) {
    // Try to load from storage
    try {
      deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
    } catch (error) {
      console.warn('Failed to load device ID from storage:', error);
    }
    
    // Generate if still missing
    if (!deviceId) {
      deviceId = nanoid();
      console.log('📱 Generated new device ID:', deviceId);
      
      // Save to storage
      try {
        await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
      } catch (error) {
        console.warn('Failed to save device ID to storage:', error);
      }
    } else {
      console.log('📱 Loaded existing device ID:', deviceId);
    }
    
    unifiedAuthState$.deviceId.set(deviceId);
    updateComputedStates();
  }
  
  return deviceId;
};

// Auth session management
const initializeAuth = async () => {
  console.log('🔐 Initializing unified auth...');
  
  unifiedAuthState$.isLoading.set(true);
  
  try {
    // Ensure device ID exists
    await ensureDeviceId();
    
    // Get initial session
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.warn('Auth session error:', error);
    }
    
    if (session) {
      console.log('🔐 Found existing session');
      unifiedAuthState$.assign({
        user: session.user,
        session: session,
      });
    } else {
      console.log('🔐 No existing session found');
    }
    
    // Set up auth state change listener
    supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔐 Auth state changed:', event, session?.user?.id);
      
      unifiedAuthState$.assign({
        user: session?.user ?? null,
        session: session,
      });
      
      updateComputedStates();
    });
    
    // Initialize network monitoring
    initializeNetworkMonitoring();
    
    // Update computed states
    updateComputedStates();
    
    unifiedAuthState$.isReady.set(true);
    console.log('🔐 Unified auth initialization complete');
    
  } catch (error) {
    console.error('Failed to initialize auth:', error);
    unifiedAuthState$.error.set(
      error instanceof Error ? error.message : 'Authentication initialization failed'
    );
  } finally {
    unifiedAuthState$.isLoading.set(false);
    unifiedAuthState$.isInitializing.set(false);
  }
};

// Auth actions
const authActions = {
  signInWithEmail: async (email: string, password: string) => {
    try {
      console.log('🔐 Signing in with email:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.error('Sign in error:', error);
        return { error };
      }
      
      console.log('🔐 Sign in successful:', data.user?.id);
      return { error: null };
      
    } catch (error) {
      console.error('Sign in failed:', error);
      return { error: error as Error };
    }
  },
  
  signUpWithEmail: async (email: string, password: string) => {
    try {
      console.log('🔐 Signing up with email:', email);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) {
        console.error('Sign up error:', error);
        return { error };
      }
      
      console.log('🔐 Sign up successful:', data.user?.id);
      return { error: null };
      
    } catch (error) {
      console.error('Sign up failed:', error);
      return { error: error as Error };
    }
  },
  
  signOut: async () => {
    try {
      console.log('🔐 Signing out...');
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Sign out error:', error);
      } else {
        console.log('🔐 Sign out successful');
      }
      
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  },
};

// Initialize auth on module load
initializeAuth();

// The unified auth hook - championship architecture implementation
export const useUnifiedAuth = (): AuthState => {
  // Force re-render when auth state changes
  const [, forceUpdate] = useState({});
  
  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = unifiedAuthState$.onChange(() => {
      forceUpdate({});
    });
    
    return unsubscribe;
  }, []);
  
  // Return current auth state with actions
  return {
    ...unifiedAuthState$.get(),
    ...authActions,
    ensureDeviceId,
  };
};

// Export for testing and debugging
export const _authState$ = unifiedAuthState$;
export const _updateComputedStates = updateComputedStates;
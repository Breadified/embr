// Authentication types and interfaces
import type { User } from '@supabase/supabase-js';

export type AuthType = 'none' | 'anonymous' | 'authenticated';

export interface AuthState {
  // Core auth state
  authType: AuthType;
  user: User | null;
  deviceId: string | null;
  
  // Network state
  isOnline: boolean;
  lastOnlineTime: number | null;
  
  // Initialization state
  isInitializing: boolean;
  isReady: boolean;
  error: string | null;
  
  // Navigation state
  needsWelcome: boolean;
  needsAuth: boolean;
  needsBabySetup: boolean;
}

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface AuthResult {
  success: boolean;
  user?: User;
  error?: string;
}
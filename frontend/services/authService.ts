import { supabase } from './supabase';
import type { User } from '@supabase/supabase-js';
import { Platform } from 'react-native';

// Authentication service for managing user auth with Supabase
export class AuthService {
  
  // Sign up a new user (currently not needed for demo, but included for completeness)
  static async signUp(email: string, password: string, metadata?: Record<string, unknown>) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata || {},
      },
    });

    if (error) {
      throw new Error(`Sign up failed: ${error.message}`);
    }

    return data;
  }

  // Sign in existing user
  static async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(`Sign in failed: ${error.message}`);
    }

    return data;
  }

  // Sign out user
  static async signOut() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw new Error(`Sign out failed: ${error.message}`);
    }
  }

  // Get current user
  static async getCurrentUser(): Promise<User | null> {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) {
      // Changed from console.error to console.log - AuthSessionMissing is expected behavior
      console.log('No current user session:', error.message);
      return null;
    }

    return user;
  }

  // Get current session
  static async getCurrentSession() {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      // Changed from console.error to console.log - session missing is expected behavior
      console.log('No current session:', error.message);
      return null;
    }

    return session;
  }

  // Listen to auth state changes
  static onAuthStateChange(callback: (user: User | null) => void) {
    return supabase.auth.onAuthStateChange((_event, session) => {
      callback(session?.user || null);
    });
  }

  // Sign in with OAuth providers
  static async signInWithProvider(provider: 'google' | 'apple' | 'github' | 'facebook') {
    // Create redirect URL for web, undefined for mobile
    const redirectTo = Platform.OS === 'web' 
      ? (typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined)
      : undefined;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        // Mobile-compatible redirect handling - only set if we have a valid redirectTo
        ...(redirectTo && { redirectTo }),
      },
    });

    if (error) {
      throw new Error(`OAuth sign in failed: ${error.message}`);
    }

    return data;
  }

  // Create anonymous session for demo mode
  static async createAnonymousSession(): Promise<User> {
    try {
      // Try to get existing anonymous user
      const existingSession = await this.getCurrentSession();
      if (existingSession?.user?.is_anonymous) {
        return existingSession.user;
      }

      // Use proper anonymous sign-in
      const { data, error } = await supabase.auth.signInAnonymously({
        options: {
          data: {
            is_anonymous: true,
            display_name: 'Demo User',
          },
        },
      });

      if (error) {
        throw new Error(`Failed to create anonymous session: ${error.message}`);
      }

      if (!data.user) {
        throw new Error('No user returned from anonymous sign in');
      }

      return data.user;
    } catch (error) {
      console.error('Failed to create anonymous session:', error);
      throw error;
    }
  }

  // Initialize authentication for demo mode
  static async initializeDemoAuth(): Promise<User> {
    try {
      // Check if user is already signed in
      const currentUser = await this.getCurrentUser();
      if (currentUser) {
        console.log('Existing user found:', currentUser.id);
        return currentUser;
      }

      // Try to create anonymous session
      console.log('Creating anonymous session...');
      return await this.createAnonymousSession();
    } catch (error) {
      console.error('Failed to initialize demo auth:', error);
      
      // Check if this is a configuration issue
      if (error instanceof Error && (
        error.message.includes('Anonymous sign-ins are disabled') ||
        error.message.includes('Legacy API keys are disabled') ||
        error.message.includes('AuthSessionMissing')
      )) {
        console.warn('Supabase anonymous auth not configured, using local demo mode');
      }
      
      // Fallback: create a mock user object for offline development
      const mockUser: User = {
        id: 'demo-user-local',
        email: 'demo@embr-local.dev',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        app_metadata: {
          provider: 'local',
          providers: ['local'],
        },
        user_metadata: {
          is_anonymous: true,
          display_name: 'Demo User (Offline)',
        },
        aud: 'authenticated',
        role: 'authenticated',
        email_confirmed_at: new Date().toISOString(),
        confirmed_at: new Date().toISOString(),
        last_sign_in_at: new Date().toISOString(),
      };

      console.log('Using mock user for demo:', mockUser.id);
      return mockUser;
    }
  }

  // Check if the current user is anonymous/demo
  static async isAnonymousUser(): Promise<boolean> {
    const user = await this.getCurrentUser();
    return user?.user_metadata?.is_anonymous === true;
  }
}
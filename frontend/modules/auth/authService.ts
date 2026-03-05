// Authentication service - business logic extracted from hooks
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User } from '@supabase/supabase-js';
import type { AuthType } from './authTypes';

const DEVICE_ID_KEY = 'embr_device_id';
const AUTH_STATE_KEY = 'embr_auth_state';

export class AuthService {
  // Generate or retrieve device ID for anonymous mode
  static async getOrCreateDeviceId(): Promise<string> {
    try {
      let deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
      if (!deviceId) {
        deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
      }
      return deviceId;
    } catch (error) {
      console.error('Failed to get/create device ID:', error);
      return `temp_device_${Date.now()}`;
    }
  }

  // Save auth state to storage
  static async saveAuthState(authType: AuthType, user?: User): Promise<void> {
    try {
      await AsyncStorage.setItem(AUTH_STATE_KEY, JSON.stringify({
        authType,
        user,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('Failed to save auth state:', error);
    }
  }

  // Load auth state from storage
  static async loadAuthState(): Promise<{ authType: AuthType; user?: User } | null> {
    try {
      const stored = await AsyncStorage.getItem(AUTH_STATE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load auth state:', error);
    }
    return null;
  }

  // Clear auth state
  static async clearAuthState(): Promise<void> {
    try {
      await AsyncStorage.removeItem(AUTH_STATE_KEY);
    } catch (error) {
      console.error('Failed to clear auth state:', error);
    }
  }

  // Skip to anonymous mode
  static async skipToAnonymous(): Promise<string> {
    const deviceId = await this.getOrCreateDeviceId();
    await this.saveAuthState('anonymous');
    return deviceId;
  }

  // Sign out
  static async signOut(): Promise<void> {
    await this.clearAuthState();
  }
}
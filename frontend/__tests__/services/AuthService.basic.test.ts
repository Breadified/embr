/**
 * Basic AuthService Test
 * Tests the authentication service functionality
 */

import { AuthService } from '../../services/authService';

// Mock Supabase client
jest.mock('../../services/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
      getSession: jest.fn(),
      signInAnonymously: jest.fn(),
      onAuthStateChange: jest.fn(),
    },
  },
}));

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initializeDemoAuth', () => {
    it('should return a mock user when Supabase is unavailable', async () => {
      // Mock Supabase methods to simulate connection issues
      const { supabase } = require('../../services/supabase');
      supabase.auth.getUser.mockRejectedValue(new Error('AuthSessionMissing'));
      supabase.auth.signInAnonymously.mockRejectedValue(new Error('Anonymous sign-ins are disabled'));

      const user = await AuthService.initializeDemoAuth();

      expect(user).toBeDefined();
      expect(user.id).toBe('demo-user-local');
      expect(user.email).toBe('demo@embr-local.dev');
      expect(user.user_metadata?.is_anonymous).toBe(true);
      expect(user.user_metadata?.display_name).toBe('Demo User (Offline)');
    });

    it('should return existing user if already authenticated', async () => {
      const mockUser = {
        id: 'existing-user-123',
        email: 'existing@example.com',
        user_metadata: { is_anonymous: false },
      };

      const { supabase } = require('../../services/supabase');
      supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

      const user = await AuthService.initializeDemoAuth();

      expect(user).toEqual(mockUser);
      expect(supabase.auth.signInAnonymously).not.toHaveBeenCalled();
    });

    it('should create anonymous session when Supabase is available', async () => {
      const mockAnonymousUser = {
        id: 'anon-user-456',
        email: null,
        user_metadata: { is_anonymous: true, display_name: 'Demo User' },
      };

      const { supabase } = require('../../services/supabase');
      supabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
      supabase.auth.signInAnonymously.mockResolvedValue({
        data: { user: mockAnonymousUser },
        error: null,
      });

      const user = await AuthService.initializeDemoAuth();

      expect(user).toEqual(mockAnonymousUser);
      expect(supabase.auth.signInAnonymously).toHaveBeenCalledWith({
        options: {
          data: {
            is_anonymous: true,
            display_name: 'Demo User',
          },
        },
      });
    });
  });

  describe('isAnonymousUser', () => {
    it('should return true for anonymous users', async () => {
      const mockAnonymousUser = {
        user_metadata: { is_anonymous: true },
      };

      const { supabase } = require('../../services/supabase');
      supabase.auth.getUser.mockResolvedValue({ data: { user: mockAnonymousUser }, error: null });

      const isAnonymous = await AuthService.isAnonymousUser();

      expect(isAnonymous).toBe(true);
    });

    it('should return false for regular users', async () => {
      const mockRegularUser = {
        user_metadata: { is_anonymous: false },
      };

      const { supabase } = require('../../services/supabase');
      supabase.auth.getUser.mockResolvedValue({ data: { user: mockRegularUser }, error: null });

      const isAnonymous = await AuthService.isAnonymousUser();

      expect(isAnonymous).toBe(false);
    });

    it('should return false when user metadata is missing', async () => {
      const mockUser = {
        user_metadata: {},
      };

      const { supabase } = require('../../services/supabase');
      supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

      const isAnonymous = await AuthService.isAnonymousUser();

      expect(isAnonymous).toBe(false);
    });
  });
});
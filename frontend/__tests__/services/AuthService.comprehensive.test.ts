import { AuthService } from '../../services/authService';
import { supabase } from '../../services/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User, AuthError } from '@supabase/supabase-js';

// Mock Supabase
jest.mock('../../services/supabase');
const mockSupabase = supabase as jest.Mocked<typeof supabase>;

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage');
const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

// Mock user objects
const mockUser: User = {
  id: 'test-user-123',
  email: 'test@example.com',
  user_metadata: {
    display_name: 'Test User',
  },
  app_metadata: {},
  aud: 'authenticated',
  created_at: '2025-08-11T00:00:00Z',
  updated_at: '2025-08-11T00:00:00Z',
  role: 'authenticated',
  confirmed_at: '2025-08-11T00:00:00Z',
  last_sign_in_at: '2025-08-11T00:00:00Z',
  email_confirmed_at: '2025-08-11T00:00:00Z',
};

const mockDemoUser: User = {
  id: 'demo-user-local',
  email: 'demo@embr-local.dev',
  user_metadata: {
    display_name: 'Demo User (Offline)',
    is_anonymous: true,
  },
  app_metadata: {
    provider: 'local',
    providers: ['local'],
  },
  aud: 'authenticated',
  created_at: '2025-08-11T00:00:00Z',
  updated_at: '2025-08-11T00:00:00Z',
  role: 'authenticated',
  confirmed_at: '2025-08-11T00:00:00Z',
  last_sign_in_at: '2025-08-11T00:00:00Z',
  email_confirmed_at: '2025-08-11T00:00:00Z',
};

describe('AuthService Comprehensive Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    mockSupabase.auth = {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signInAnonymously: jest.fn(),
      signOut: jest.fn(),
      getUser: jest.fn(),
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(),
    } as any;
  });

  describe('Sign Up', () => {
    it('successfully creates new user account', async () => {
      const mockResponse = {
        data: { user: mockUser, session: { access_token: 'test-token' } },
        error: null,
      };
      mockSupabase.auth.signUp.mockResolvedValue(mockResponse);

      const result = await AuthService.signUp('test@example.com', 'password123');

      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        options: {
          data: {
            display_name: 'test',
          },
        },
      });
      expect(result).toEqual(mockUser);
    });

    it('extracts display name from email', async () => {
      const mockResponse = {
        data: { user: mockUser, session: { access_token: 'test-token' } },
        error: null,
      };
      mockSupabase.auth.signUp.mockResolvedValue(mockResponse);

      await AuthService.signUp('john.doe@example.com', 'password123');

      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: 'john.doe@example.com',
        password: 'password123',
        options: {
          data: {
            display_name: 'john.doe',
          },
        },
      });
    });

    it('handles sign up errors', async () => {
      const mockError: AuthError = {
        message: 'User already registered',
        name: 'AuthError',
      };
      const mockResponse = {
        data: { user: null, session: null },
        error: mockError,
      };
      mockSupabase.auth.signUp.mockResolvedValue(mockResponse);

      await expect(AuthService.signUp('existing@example.com', 'password123')).rejects.toThrow(
        'User already registered'
      );
    });

    it('handles network errors during sign up', async () => {
      mockSupabase.auth.signUp.mockRejectedValue(new Error('Network error'));

      await expect(AuthService.signUp('test@example.com', 'password123')).rejects.toThrow(
        'Network error'
      );
    });

    it('validates email format', async () => {
      await expect(AuthService.signUp('invalid-email', 'password123')).rejects.toThrow(
        'Invalid email format'
      );
    });

    it('validates password strength', async () => {
      await expect(AuthService.signUp('test@example.com', '123')).rejects.toThrow(
        'Password must be at least 6 characters long'
      );
    });
  });

  describe('Sign In', () => {
    it('successfully signs in existing user', async () => {
      const mockResponse = {
        data: { user: mockUser, session: { access_token: 'test-token' } },
        error: null,
      };
      mockSupabase.auth.signInWithPassword.mockResolvedValue(mockResponse);

      const result = await AuthService.signIn('test@example.com', 'password123');

      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(result).toEqual(mockUser);
    });

    it('handles invalid credentials', async () => {
      const mockError: AuthError = {
        message: 'Invalid login credentials',
        name: 'AuthError',
      };
      const mockResponse = {
        data: { user: null, session: null },
        error: mockError,
      };
      mockSupabase.auth.signInWithPassword.mockResolvedValue(mockResponse);

      await expect(AuthService.signIn('wrong@example.com', 'wrongpassword')).rejects.toThrow(
        'Invalid login credentials'
      );
    });

    it('handles network errors during sign in', async () => {
      mockSupabase.auth.signInWithPassword.mockRejectedValue(new Error('Connection timeout'));

      await expect(AuthService.signIn('test@example.com', 'password123')).rejects.toThrow(
        'Connection timeout'
      );
    });

    it('trims whitespace from email', async () => {
      const mockResponse = {
        data: { user: mockUser, session: { access_token: 'test-token' } },
        error: null,
      };
      mockSupabase.auth.signInWithPassword.mockResolvedValue(mockResponse);

      await AuthService.signIn('  test@example.com  ', 'password123');

      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    it('validates email format before sign in', async () => {
      await expect(AuthService.signIn('invalid-email', 'password123')).rejects.toThrow(
        'Invalid email format'
      );
    });
  });

  describe('Sign Out', () => {
    it('successfully signs out user', async () => {
      mockSupabase.auth.signOut.mockResolvedValue({ error: null });

      await expect(AuthService.signOut()).resolves.not.toThrow();

      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
    });

    it('handles sign out errors', async () => {
      const mockError: AuthError = {
        message: 'Sign out failed',
        name: 'AuthError',
      };
      mockSupabase.auth.signOut.mockResolvedValue({ error: mockError });

      await expect(AuthService.signOut()).rejects.toThrow('Sign out failed');
    });

    it('clears local storage on sign out', async () => {
      mockSupabase.auth.signOut.mockResolvedValue({ error: null });

      await AuthService.signOut();

      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('demo_user_session');
    });
  });

  describe('Demo Mode', () => {
    it('creates demo user when Supabase is available', async () => {
      const mockAnonymousResponse = {
        data: { user: mockDemoUser, session: { access_token: 'demo-token' } },
        error: null,
      };
      mockSupabase.auth.signInAnonymously.mockResolvedValue(mockAnonymousResponse);

      const result = await AuthService.initializeDemoAuth();

      expect(mockSupabase.auth.signInAnonymously).toHaveBeenCalledWith({
        options: {
          data: {
            display_name: 'Demo User',
            is_anonymous: true,
          },
        },
      });
      expect(result).toEqual(mockDemoUser);
    });

    it('creates offline demo user when Supabase fails', async () => {
      mockSupabase.auth.signInAnonymously.mockRejectedValue(new Error('Network error'));
      mockAsyncStorage.setItem.mockResolvedValue();

      const result = await AuthService.initializeDemoAuth();

      expect(result.email).toBe('demo@embr-local.dev');
      expect(result.user_metadata.is_anonymous).toBe(true);
      expect(result.user_metadata.display_name).toBe('Demo User (Offline)');
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'demo_user_session',
        expect.any(String)
      );
    });

    it('persists demo session to local storage', async () => {
      mockSupabase.auth.signInAnonymously.mockRejectedValue(new Error('Network error'));
      mockAsyncStorage.setItem.mockResolvedValue();

      const result = await AuthService.initializeDemoAuth();

      const expectedSession = {
        user: result,
        access_token: null,
        token_type: 'offline',
        expires_in: null,
        expires_at: null,
        refresh_token: null,
      };

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'demo_user_session',
        JSON.stringify(expectedSession)
      );
    });

    it('generates unique demo user IDs', async () => {
      mockSupabase.auth.signInAnonymously.mockRejectedValue(new Error('Network error'));

      const user1 = await AuthService.initializeDemoAuth();
      const user2 = await AuthService.initializeDemoAuth();

      expect(user1.id).not.toEqual(user2.id);
    });
  });

  describe('Current User', () => {
    it('gets current user from Supabase when available', async () => {
      const mockResponse = {
        data: { user: mockUser },
        error: null,
      };
      mockSupabase.auth.getUser.mockResolvedValue(mockResponse);

      const result = await AuthService.getCurrentUser();

      expect(mockSupabase.auth.getUser).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });

    it('gets demo user from local storage when Supabase fails', async () => {
      mockSupabase.auth.getUser.mockRejectedValue(new Error('Network error'));
      const demoSession = {
        user: mockDemoUser,
        access_token: null,
        token_type: 'offline',
        expires_in: null,
        expires_at: null,
        refresh_token: null,
      };
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(demoSession));

      const result = await AuthService.getCurrentUser();

      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith('demo_user_session');
      expect(result).toEqual(mockDemoUser);
    });

    it('returns null when no user is authenticated', async () => {
      const mockResponse = {
        data: { user: null },
        error: null,
      };
      mockSupabase.auth.getUser.mockResolvedValue(mockResponse);
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const result = await AuthService.getCurrentUser();

      expect(result).toBeNull();
    });

    it('handles corrupted demo session data', async () => {
      mockSupabase.auth.getUser.mockRejectedValue(new Error('Network error'));
      mockAsyncStorage.getItem.mockResolvedValue('invalid-json');

      const result = await AuthService.getCurrentUser();

      expect(result).toBeNull();
    });
  });

  describe('Session Management', () => {
    it('gets current session from Supabase', async () => {
      const mockSession = {
        access_token: 'test-token',
        refresh_token: 'refresh-token',
        expires_in: 3600,
        expires_at: Date.now() + 3600000,
        token_type: 'bearer',
        user: mockUser,
      };
      const mockResponse = {
        data: { session: mockSession },
        error: null,
      };
      mockSupabase.auth.getSession.mockResolvedValue(mockResponse);

      const result = await AuthService.getSession();

      expect(mockSupabase.auth.getSession).toHaveBeenCalled();
      expect(result).toEqual(mockSession);
    });

    it('gets demo session from local storage', async () => {
      const demoSession = {
        user: mockDemoUser,
        access_token: null,
        token_type: 'offline',
        expires_in: null,
        expires_at: null,
        refresh_token: null,
      };
      mockSupabase.auth.getSession.mockRejectedValue(new Error('Network error'));
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(demoSession));

      const result = await AuthService.getSession();

      expect(result).toEqual(demoSession);
    });

    it('returns null when no session exists', async () => {
      const mockResponse = {
        data: { session: null },
        error: null,
      };
      mockSupabase.auth.getSession.mockResolvedValue(mockResponse);
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const result = await AuthService.getSession();

      expect(result).toBeNull();
    });
  });

  describe('Auth State Changes', () => {
    it('sets up auth state change listener', () => {
      const mockCallback = jest.fn();
      mockSupabase.auth.onAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      } as any);

      AuthService.onAuthStateChange(mockCallback);

      expect(mockSupabase.auth.onAuthStateChange).toHaveBeenCalledWith(mockCallback);
    });

    it('returns unsubscribe function', () => {
      const mockUnsubscribe = jest.fn();
      mockSupabase.auth.onAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: mockUnsubscribe } },
      } as any);

      const { unsubscribe } = AuthService.onAuthStateChange(jest.fn());

      expect(typeof unsubscribe).toBe('function');
      
      unsubscribe();
      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('Input Validation', () => {
    it('validates email format correctly', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
      ];

      const invalidEmails = [
        'invalid-email',
        '@domain.com',
        'user@',
        'user@domain',
        'user name@domain.com',
      ];

      validEmails.forEach(email => {
        expect(() => AuthService.signIn(email, 'password123')).not.toThrow();
      });

      invalidEmails.forEach(async (email) => {
        await expect(AuthService.signIn(email, 'password123')).rejects.toThrow(
          'Invalid email format'
        );
      });
    });

    it('validates password strength', async () => {
      const weakPasswords = ['', '123', '12345', 'a', 'ab123'];
      const strongPasswords = ['123456', 'password123', 'MySecurePass123!'];

      for (const password of weakPasswords) {
        await expect(AuthService.signUp('test@example.com', password)).rejects.toThrow(
          'Password must be at least 6 characters long'
        );
      }

      // Strong passwords should not throw validation errors (they may fail for other reasons)
      for (const password of strongPasswords) {
        mockSupabase.auth.signUp.mockRejectedValue(new Error('Network error'));
        
        try {
          await AuthService.signUp('test@example.com', password);
        } catch (error) {
          expect(error.message).not.toBe('Password must be at least 6 characters long');
        }
      }
    });
  });

  describe('Error Handling', () => {
    it('provides user-friendly error messages', async () => {
      const supabaseErrors = [
        { message: 'Invalid login credentials', expected: 'Invalid email or password' },
        { message: 'User not found', expected: 'Account not found' },
        { message: 'Email rate limit exceeded', expected: 'Too many requests. Please try again later' },
        { message: 'Password should be at least 6 characters', expected: 'Password must be at least 6 characters long' },
      ];

      for (const { message, expected } of supabaseErrors) {
        const mockError: AuthError = { message, name: 'AuthError' };
        mockSupabase.auth.signIn.mockResolvedValue({
          data: { user: null, session: null },
          error: mockError,
        });

        await expect(AuthService.signIn('test@example.com', 'password')).rejects.toThrow(expected);
      }
    });

    it('handles unknown errors gracefully', async () => {
      const mockError: AuthError = {
        message: 'Unknown database error XYZ123',
        name: 'AuthError',
      };
      mockSupabase.auth.signIn.mockResolvedValue({
        data: { user: null, session: null },
        error: mockError,
      });

      await expect(AuthService.signIn('test@example.com', 'password')).rejects.toThrow(
        'Authentication failed. Please try again'
      );
    });
  });

  describe('Performance and Reliability', () => {
    it('implements request timeouts', async () => {
      // Mock a hanging request
      mockSupabase.auth.signIn.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      // Should timeout after reasonable amount of time
      await expect(AuthService.signIn('test@example.com', 'password')).rejects.toThrow();
    }, 10000); // 10 second timeout for test itself

    it('handles concurrent authentication requests', async () => {
      const mockResponse = {
        data: { user: mockUser, session: { access_token: 'test-token' } },
        error: null,
      };
      mockSupabase.auth.signIn.mockResolvedValue(mockResponse);

      // Make multiple concurrent requests
      const requests = Promise.all([
        AuthService.signIn('test@example.com', 'password'),
        AuthService.signIn('test@example.com', 'password'),
        AuthService.signIn('test@example.com', 'password'),
      ]);

      await expect(requests).resolves.toEqual([mockUser, mockUser, mockUser]);
    });
  });
});
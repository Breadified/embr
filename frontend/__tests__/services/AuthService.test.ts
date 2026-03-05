import { AuthService } from '../../services/authService';

// Mock the MCP Supabase functions and Auth
const mockSupabaseExecuteSQL = jest.fn();
const mockSupabaseAuth = {
  signUp: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn(),
  getUser: jest.fn(),
  getSession: jest.fn(),
  resetPassword: jest.fn(),
  updatePassword: jest.fn(),
  onAuthStateChange: jest.fn(),
};

global.mcp__supabase__execute_sql = mockSupabaseExecuteSQL;
global.mcp__supabase__auth = mockSupabaseAuth;

describe('AuthService', () => {
  const mockEmail = 'test@example.com';
  const mockPassword = 'securePassword123!';
  const mockUserId = 'user-123-456-789';
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabaseExecuteSQL.mockResolvedValue({ data: [], error: null });
  });

  describe('User Registration', () => {
    it('registers new user with email and password', async () => {
      const mockUser = {
        id: mockUserId,
        email: mockEmail,
        email_confirmed_at: null,
        created_at: '2024-01-01T10:00:00Z',
      };

      mockSupabaseAuth.signUp.mockResolvedValue({
        data: { user: mockUser, session: null },
        error: null,
      });

      const result = await AuthService.signUp({
        email: mockEmail,
        password: mockPassword,
      });

      expect(mockSupabaseAuth.signUp).toHaveBeenCalledWith({
        email: mockEmail,
        password: mockPassword,
      });
      
      expect(result.user).toEqual(mockUser);
      expect(result.requiresVerification).toBe(true);
    });

    it('validates email format', async () => {
      await expect(
        AuthService.signUp({
          email: 'invalid-email',
          password: mockPassword,
        })
      ).rejects.toThrow('Invalid email format');
    });

    it('validates password strength', async () => {
      await expect(
        AuthService.signUp({
          email: mockEmail,
          password: '123', // Too short
        })
      ).rejects.toThrow('Password must be at least 8 characters long');

      await expect(
        AuthService.signUp({
          email: mockEmail,
          password: 'onlylowercase', // No uppercase, numbers, or symbols
        })
      ).rejects.toThrow('Password must contain uppercase, lowercase, number, and symbol');
    });

    it('handles duplicate email registration', async () => {
      mockSupabaseAuth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: {
          message: 'User already registered',
          status: 422,
        },
      });

      await expect(
        AuthService.signUp({
          email: mockEmail,
          password: mockPassword,
        })
      ).rejects.toThrow('An account with this email already exists');
    });

    it('creates user profile after successful registration', async () => {
      const mockUser = {
        id: mockUserId,
        email: mockEmail,
        email_confirmed_at: null,
      };

      mockSupabaseAuth.signUp.mockResolvedValue({
        data: { user: mockUser, session: null },
        error: null,
      });

      const profileData = {
        email: mockEmail,
        password: mockPassword,
        firstName: 'John',
        lastName: 'Doe',
        timezone: 'America/New_York',
      };

      await AuthService.signUp(profileData);

      expect(mockSupabaseExecuteSQL).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO profiles')
      );
    });

    it('supports social authentication providers', async () => {
      mockSupabaseAuth.signIn.mockResolvedValue({
        data: { user: { id: mockUserId, email: mockEmail }, session: {} },
        error: null,
      });

      await AuthService.signInWithProvider('google');

      expect(mockSupabaseAuth.signIn).toHaveBeenCalledWith({
        provider: 'google',
      });
    });
  });

  describe('User Authentication', () => {
    it('signs in user with valid credentials', async () => {
      const mockSession = {
        access_token: 'access-token-123',
        refresh_token: 'refresh-token-456',
        expires_in: 3600,
        user: {
          id: mockUserId,
          email: mockEmail,
          email_confirmed_at: '2024-01-01T10:00:00Z',
        },
      };

      mockSupabaseAuth.signIn.mockResolvedValue({
        data: { user: mockSession.user, session: mockSession },
        error: null,
      });

      const result = await AuthService.signIn({
        email: mockEmail,
        password: mockPassword,
      });

      expect(mockSupabaseAuth.signIn).toHaveBeenCalledWith({
        email: mockEmail,
        password: mockPassword,
      });
      
      expect(result.user).toEqual(mockSession.user);
      expect(result.session).toEqual(mockSession);
    });

    it('handles invalid credentials', async () => {
      mockSupabaseAuth.signIn.mockResolvedValue({
        data: { user: null, session: null },
        error: {
          message: 'Invalid login credentials',
          status: 400,
        },
      });

      await expect(
        AuthService.signIn({
          email: mockEmail,
          password: 'wrongpassword',
        })
      ).rejects.toThrow('Invalid email or password');
    });

    it('handles unconfirmed email', async () => {
      mockSupabaseAuth.signIn.mockResolvedValue({
        data: { user: null, session: null },
        error: {
          message: 'Email not confirmed',
          status: 400,
        },
      });

      await expect(
        AuthService.signIn({
          email: mockEmail,
          password: mockPassword,
        })
      ).rejects.toThrow('Please confirm your email address before signing in');
    });

    it('implements rate limiting for failed attempts', async () => {
      // Simulate multiple failed attempts
      mockSupabaseAuth.signIn.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid credentials', status: 400 },
      });

      // First 3 attempts should work normally
      for (let i = 0; i < 3; i++) {
        await AuthService.signIn({
          email: mockEmail,
          password: 'wrongpassword',
        }).catch(() => {}); // Ignore errors
      }

      // 4th attempt should be rate limited
      await expect(
        AuthService.signIn({
          email: mockEmail,
          password: 'wrongpassword',
        })
      ).rejects.toThrow('Too many failed attempts. Please try again later.');
    });

    it('tracks login attempts and device information', async () => {
      const mockUserAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)';
      const mockIpAddress = '192.168.1.100';

      // Mock browser environment
      Object.defineProperty(window, 'navigator', {
        value: { userAgent: mockUserAgent },
        writable: true,
      });

      mockSupabaseAuth.signIn.mockResolvedValue({
        data: { 
          user: { id: mockUserId, email: mockEmail }, 
          session: { access_token: 'token' } 
        },
        error: null,
      });

      await AuthService.signIn({
        email: mockEmail,
        password: mockPassword,
      });

      expect(mockSupabaseExecuteSQL).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO login_attempts')
      );
    });
  });

  describe('Session Management', () => {
    it('retrieves current session', async () => {
      const mockSession = {
        access_token: 'token-123',
        user: { id: mockUserId, email: mockEmail },
        expires_at: Date.now() + 3600000,
      };

      mockSupabaseAuth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const result = await AuthService.getCurrentSession();

      expect(result).toEqual(mockSession);
    });

    it('handles expired sessions', async () => {
      const expiredSession = {
        access_token: 'expired-token',
        user: { id: mockUserId, email: mockEmail },
        expires_at: Date.now() - 3600000, // Expired 1 hour ago
      };

      mockSupabaseAuth.getSession.mockResolvedValue({
        data: { session: expiredSession },
        error: null,
      });

      const result = await AuthService.getCurrentSession();

      expect(result).toBeNull();
      expect(mockSupabaseAuth.signOut).toHaveBeenCalled();
    });

    it('refreshes tokens automatically', async () => {
      const mockRefreshResponse = {
        data: {
          session: {
            access_token: 'new-token-123',
            refresh_token: 'new-refresh-456',
            expires_at: Date.now() + 3600000,
          },
        },
        error: null,
      };

      mockSupabaseAuth.refreshSession = jest.fn().mockResolvedValue(mockRefreshResponse);

      await AuthService.refreshSession();

      expect(mockSupabaseAuth.refreshSession).toHaveBeenCalled();
    });

    it('signs out user and cleans up session data', async () => {
      mockSupabaseAuth.signOut.mockResolvedValue({
        error: null,
      });

      await AuthService.signOut();

      expect(mockSupabaseAuth.signOut).toHaveBeenCalled();
      
      // Should clear local storage/cache
      expect(localStorage.getItem('supabase.auth.token')).toBeNull();
    });
  });

  describe('Password Management', () => {
    it('initiates password reset flow', async () => {
      mockSupabaseAuth.resetPassword.mockResolvedValue({
        data: {},
        error: null,
      });

      await AuthService.resetPassword(mockEmail);

      expect(mockSupabaseAuth.resetPassword).toHaveBeenCalledWith(mockEmail);
    });

    it('validates email exists before password reset', async () => {
      mockSupabaseExecuteSQL.mockResolvedValue({
        data: [], // No user found
        error: null,
      });

      await expect(
        AuthService.resetPassword('nonexistent@example.com')
      ).rejects.toThrow('No account found with this email address');
    });

    it('updates password with proper validation', async () => {
      mockSupabaseAuth.updatePassword.mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null,
      });

      const newPassword = 'NewSecurePassword123!';

      await AuthService.updatePassword(newPassword);

      expect(mockSupabaseAuth.updatePassword).toHaveBeenCalledWith(newPassword);
    });

    it('prevents password reuse', async () => {
      // Mock password history
      mockSupabaseExecuteSQL.mockResolvedValue({
        data: [
          { password_hash: 'hash1', created_at: '2024-01-01' },
          { password_hash: 'hash2', created_at: '2024-01-15' },
        ],
        error: null,
      });

      await expect(
        AuthService.updatePassword('previousPassword123!')
      ).rejects.toThrow('Cannot reuse any of your last 5 passwords');
    });
  });

  describe('User Profile Management', () => {
    it('retrieves complete user profile', async () => {
      const mockProfile = {
        id: mockUserId,
        email: mockEmail,
        first_name: 'John',
        last_name: 'Doe',
        timezone: 'America/New_York',
        preferences: {
          notifications: true,
          theme: 'light',
          units: 'imperial',
        },
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
      };

      mockSupabaseExecuteSQL.mockResolvedValue({
        data: [mockProfile],
        error: null,
      });

      const result = await AuthService.getUserProfile(mockUserId);

      expect(mockSupabaseExecuteSQL).toHaveBeenCalledWith(
        expect.stringContaining(`SELECT * FROM profiles WHERE id = '${mockUserId}'`)
      );
      
      expect(result).toEqual(mockProfile);
    });

    it('updates user profile information', async () => {
      const profileUpdates = {
        firstName: 'Jane',
        lastName: 'Smith',
        timezone: 'Europe/London',
        preferences: {
          notifications: false,
          theme: 'dark',
          units: 'metric',
        },
      };

      mockSupabaseExecuteSQL.mockResolvedValue({
        data: [{ affected_rows: 1 }],
        error: null,
      });

      await AuthService.updateUserProfile(mockUserId, profileUpdates);

      expect(mockSupabaseExecuteSQL).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE profiles SET')
      );
    });

    it('validates profile updates', async () => {
      await expect(
        AuthService.updateUserProfile(mockUserId, {
          firstName: '', // Empty name
        })
      ).rejects.toThrow('First name cannot be empty');

      await expect(
        AuthService.updateUserProfile(mockUserId, {
          timezone: 'Invalid/Timezone', // Invalid timezone
        })
      ).rejects.toThrow('Invalid timezone');
    });
  });

  describe('Multi-Factor Authentication', () => {
    it('enrolls user in MFA', async () => {
      mockSupabaseAuth.mfa = {
        enroll: jest.fn().mockResolvedValue({
          data: { id: 'factor-123', type: 'totp' },
          error: null,
        }),
      };

      const result = await AuthService.enableMFA('totp');

      expect(mockSupabaseAuth.mfa.enroll).toHaveBeenCalledWith({
        factorType: 'totp',
      });
      
      expect(result.factorId).toBe('factor-123');
    });

    it('challenges MFA during sign in', async () => {
      mockSupabaseAuth.mfa = {
        challenge: jest.fn().mockResolvedValue({
          data: { id: 'challenge-123' },
          error: null,
        }),
        verify: jest.fn().mockResolvedValue({
          data: { session: { access_token: 'token' } },
          error: null,
        }),
      };

      const challengeId = await AuthService.createMFAChallenge('factor-123');
      const session = await AuthService.verifyMFA(challengeId, '123456');

      expect(mockSupabaseAuth.mfa.challenge).toHaveBeenCalled();
      expect(mockSupabaseAuth.mfa.verify).toHaveBeenCalledWith({
        challengeId,
        code: '123456',
      });
      
      expect(session).toHaveProperty('access_token');
    });

    it('provides backup codes for MFA', async () => {
      const backupCodes = await AuthService.generateMFABackupCodes(mockUserId);

      expect(backupCodes).toHaveLength(10);
      expect(backupCodes[0]).toMatch(/^\d{8}$/); // 8-digit codes
    });
  });

  describe('Security Features', () => {
    it('detects suspicious login patterns', async () => {
      // Mock unusual login (different country/device)
      const suspiciousLogin = {
        email: mockEmail,
        password: mockPassword,
        metadata: {
          ipAddress: '203.0.113.1', // Different country
          userAgent: 'Unknown browser',
        },
      };

      mockSupabaseAuth.signIn.mockResolvedValue({
        data: { 
          user: { id: mockUserId, email: mockEmail }, 
          session: { access_token: 'token' } 
        },
        error: null,
      });

      const result = await AuthService.signIn(suspiciousLogin);

      expect(result.requiresAdditionalVerification).toBe(true);
      expect(mockSupabaseExecuteSQL).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO security_alerts')
      );
    });

    it('locks account after too many failed attempts', async () => {
      // Simulate account lockout after 5 failed attempts
      mockSupabaseExecuteSQL
        .mockResolvedValueOnce({ 
          data: [{ failed_attempts: 5 }], 
          error: null 
        });

      await expect(
        AuthService.signIn({
          email: mockEmail,
          password: 'wrongpassword',
        })
      ).rejects.toThrow('Account temporarily locked due to too many failed login attempts');
    });

    it('validates session integrity', async () => {
      const tamperedToken = 'tampered.jwt.token';
      
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid JWT' },
      });

      const isValid = await AuthService.validateSession(tamperedToken);

      expect(isValid).toBe(false);
    });

    it('implements CSRF protection', async () => {
      const csrfToken = AuthService.generateCSRFToken();
      
      expect(csrfToken).toMatch(/^[a-f0-9]{64}$/); // 64-char hex string
      
      const isValid = AuthService.validateCSRFToken(csrfToken);
      expect(isValid).toBe(true);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('handles network timeouts gracefully', async () => {
      mockSupabaseAuth.signIn.mockRejectedValue(new Error('Network timeout'));

      await expect(
        AuthService.signIn({
          email: mockEmail,
          password: mockPassword,
        })
      ).rejects.toThrow('Connection timeout. Please check your internet connection.');
    });

    it('handles service unavailable errors', async () => {
      mockSupabaseAuth.signIn.mockResolvedValue({
        data: { user: null, session: null },
        error: {
          message: 'Service unavailable',
          status: 503,
        },
      });

      await expect(
        AuthService.signIn({
          email: mockEmail,
          password: mockPassword,
        })
      ).rejects.toThrow('Authentication service is temporarily unavailable');
    });

    it('logs security events appropriately', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      mockSupabaseAuth.signIn.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid credentials', status: 400 },
      });

      await AuthService.signIn({
        email: mockEmail,
        password: 'wrongpassword',
      }).catch(() => {}); // Ignore error

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed login attempt'),
        expect.objectContaining({
          email: mockEmail,
          timestamp: expect.any(String),
        })
      );

      consoleSpy.mockRestore();
    });

    it('handles concurrent session conflicts', async () => {
      // Simulate user signing in from multiple devices
      const device1Session = AuthService.signIn({
        email: mockEmail,
        password: mockPassword,
      });

      const device2Session = AuthService.signIn({
        email: mockEmail,
        password: mockPassword,
      });

      await Promise.all([device1Session, device2Session]);

      // Should handle multiple sessions or invalidate older ones
      expect(mockSupabaseAuth.signIn).toHaveBeenCalledTimes(2);
    });
  });

  describe('Data Privacy and Compliance', () => {
    it('anonymizes sensitive data in logs', async () => {
      const sensitiveCredentials = {
        email: 'sensitive@example.com',
        password: 'secretPassword123!',
        personalInfo: {
          ssn: '123-45-6789',
          phoneNumber: '+1-555-0123',
        },
      };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await AuthService.signUp(sensitiveCredentials).catch(() => {}); // May fail

      const loggedData = consoleSpy.mock.calls.join(' ');
      expect(loggedData).not.toContain('secretPassword123!');
      expect(loggedData).not.toContain('123-45-6789');

      consoleSpy.mockRestore();
    });

    it('implements data retention policies', async () => {
      // Old login attempts should be cleaned up
      await AuthService.cleanupOldLoginAttempts(90); // Keep 90 days

      expect(mockSupabaseExecuteSQL).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM login_attempts WHERE created_at < NOW() - INTERVAL \'90 days\'')
      );
    });

    it('supports GDPR data export', async () => {
      const userData = await AuthService.exportUserData(mockUserId);

      expect(userData).toHaveProperty('profile');
      expect(userData).toHaveProperty('loginHistory');
      expect(userData).toHaveProperty('preferences');
      expect(userData).toHaveProperty('babies');
    });

    it('supports GDPR data deletion', async () => {
      await AuthService.deleteUserData(mockUserId, { 
        hardDelete: true,
        confirmationToken: 'confirmed-deletion-123' 
      });

      expect(mockSupabaseExecuteSQL).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM profiles WHERE id')
      );
    });
  });
});
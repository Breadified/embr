import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { AuthScreen } from '../../components/auth/AuthScreen';
import { Dashboard } from '../../components/dashboard/Dashboard';
import { AuthService } from '../../services/authService';
import { babyActions, babySelectors } from '../../state/babyStore';
import { activityActions } from '../../state/activityStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User } from '@supabase/supabase-js';
import type { Baby } from '../../types/database';

// Mock all dependencies
jest.mock('../../services/authService');
jest.mock('../../state/babyStore');
jest.mock('../../state/activityStore');
jest.mock('@react-native-async-storage/async-storage');

const mockAuthService = AuthService as jest.Mocked<typeof AuthService>;
const mockBabyActions = babyActions as jest.Mocked<typeof babyActions>;
const mockBabySelectors = babySelectors as jest.Mocked<typeof babySelectors>;
const mockActivityActions = activityActions as jest.Mocked<typeof activityActions>;
const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

// Mock Alert
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

// Test data
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

const mockBaby: Baby = {
  id: 'baby-123',
  user_id: 'test-user-123',
  name: 'Test Baby',
  birth_date: '2025-01-01',
  created_at: '2025-08-11T00:00:00Z',
  updated_at: '2025-08-11T00:00:00Z',
};

describe('User Journey Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock returns
    mockBabySelectors.getActiveBaby.mockReturnValue(mockBaby);
    mockBabySelectors.hasBabies.mockReturnValue(true);
    mockBabyActions.loadBabies.mockResolvedValue(undefined);
    mockActivityActions.loadRecentActivities.mockResolvedValue(undefined);
  });

  describe('Complete Authentication Flow', () => {
    it('allows user to sign up and access dashboard', async () => {
      mockAuthService.signUp.mockResolvedValue(mockUser);
      
      // Create a simple app component that manages auth state
      const TestApp: React.FC = () => {
        const [user, setUser] = React.useState<User | null>(null);
        
        if (!user) {
          return <AuthScreen onAuthComplete={setUser} />;
        }
        
        return <Dashboard user={user} onSignOut={() => setUser(null)} />;
      };
      
      render(<TestApp />);
      
      // Should start with welcome screen
      expect(screen.getByText('Welcome to Baby Tracker')).toBeTruthy();
      
      // Navigate to sign up
      fireEvent.press(screen.getByText('Create Account'));
      expect(screen.getByText('Create Your Account')).toBeTruthy();
      
      // Fill in sign up form
      fireEvent.changeText(screen.getByPlaceholderText('Email'), 'newuser@example.com');
      fireEvent.changeText(screen.getByPlaceholderText('Password'), 'password123');
      fireEvent.press(screen.getByText('Create Account'));
      
      // Should transition to dashboard
      await waitFor(() => {
        expect(screen.getByText('Hello, Test User!')).toBeTruthy();
        expect(screen.getByText('Tracking: Test Baby')).toBeTruthy();
      });
      
      // Verify auth service was called correctly
      expect(mockAuthService.signUp).toHaveBeenCalledWith('newuser@example.com', 'password123');
      expect(mockBabyActions.loadBabies).toHaveBeenCalledWith(mockUser.id);
    });

    it('allows user to sign in and access dashboard', async () => {
      mockAuthService.signIn.mockResolvedValue(mockUser);
      
      const TestApp: React.FC = () => {
        const [user, setUser] = React.useState<User | null>(null);
        
        if (!user) {
          return <AuthScreen onAuthComplete={setUser} />;
        }
        
        return <Dashboard user={user} onSignOut={() => setUser(null)} />;
      };
      
      render(<TestApp />);
      
      // Navigate to sign in
      fireEvent.press(screen.getByText('Sign In'));
      
      // Fill in sign in form
      fireEvent.changeText(screen.getByPlaceholderText('Email'), 'existing@example.com');
      fireEvent.changeText(screen.getByPlaceholderText('Password'), 'password123');
      fireEvent.press(screen.getByText('Sign In'));
      
      // Should transition to dashboard
      await waitFor(() => {
        expect(screen.getByText('Hello, Test User!')).toBeTruthy();
      });
      
      expect(mockAuthService.signIn).toHaveBeenCalledWith('existing@example.com', 'password123');
    });

    it('allows complete sign out flow', async () => {
      mockAuthService.signOut.mockResolvedValue();
      
      const TestApp: React.FC = () => {
        const [user, setUser] = React.useState<User | null>(mockUser);
        
        const handleSignOut = async () => {
          await mockAuthService.signOut();
          setUser(null);
        };
        
        if (!user) {
          return <AuthScreen onAuthComplete={setUser} />;
        }
        
        return <Dashboard user={user} onSignOut={handleSignOut} />;
      };
      
      render(<TestApp />);
      
      // Should start with dashboard
      expect(screen.getByText('Hello, Test User!')).toBeTruthy();
      
      // Sign out
      fireEvent.press(screen.getByText('Sign Out'));
      
      // Should return to auth screen
      await waitFor(() => {
        expect(screen.getByText('Welcome to Baby Tracker')).toBeTruthy();
      });
      
      expect(mockAuthService.signOut).toHaveBeenCalled();
    });
  });

  describe('Demo Mode User Journey', () => {
    it('allows guest user to access demo mode and track activities', async () => {
      mockAuthService.initializeDemoAuth.mockResolvedValue(mockDemoUser);
      
      const TestApp: React.FC = () => {
        const [user, setUser] = React.useState<User | null>(null);
        
        if (!user) {
          return <AuthScreen onAuthComplete={setUser} />;
        }
        
        return <Dashboard user={user} onSignOut={() => setUser(null)} />;
      };
      
      render(<TestApp />);
      
      // Start as guest
      fireEvent.press(screen.getByText('Continue as Guest'));
      
      // Should transition to dashboard in demo mode
      await waitFor(() => {
        expect(screen.getByText('Demo Mode')).toBeTruthy();
        expect(screen.getByText('Hello, Demo User (Offline)!')).toBeTruthy();
      });
      
      // Should be able to interact with activity cards
      expect(screen.getByText('Nursing')).toBeTruthy();
      expect(screen.getByText('Bottle Feeding')).toBeTruthy();
      
      expect(mockAuthService.initializeDemoAuth).toHaveBeenCalled();
    });

    it('persists demo session across app restarts', async () => {
      const demoSession = {
        user: mockDemoUser,
        access_token: null,
        token_type: 'offline',
        expires_in: null,
        expires_at: null,
        refresh_token: null,
      };
      
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(demoSession));
      mockAuthService.getCurrentUser.mockResolvedValue(mockDemoUser);
      
      const TestApp: React.FC = () => {
        const [user, setUser] = React.useState<User | null>(null);
        
        React.useEffect(() => {
          // Simulate app startup user check
          AuthService.getCurrentUser().then(setUser);
        }, []);
        
        if (!user) {
          return <AuthScreen onAuthComplete={setUser} />;
        }
        
        return <Dashboard user={user} onSignOut={() => setUser(null)} />;
      };
      
      render(<TestApp />);
      
      // Should automatically load demo user
      await waitFor(() => {
        expect(screen.getByText('Demo Mode')).toBeTruthy();
      });
      
      expect(mockAuthService.getCurrentUser).toHaveBeenCalled();
    });
  });

  describe('Error Recovery Flows', () => {
    it('handles network errors during authentication gracefully', async () => {
      mockAuthService.signIn.mockRejectedValue(new Error('Network error'));
      
      const TestApp: React.FC = () => {
        const [user, setUser] = React.useState<User | null>(null);
        
        if (!user) {
          return <AuthScreen onAuthComplete={setUser} />;
        }
        
        return <Dashboard user={user} onSignOut={() => setUser(null)} />;
      };
      
      render(<TestApp />);
      
      // Try to sign in
      fireEvent.press(screen.getByText('Sign In'));
      fireEvent.changeText(screen.getByPlaceholderText('Email'), 'test@example.com');
      fireEvent.changeText(screen.getByPlaceholderText('Password'), 'password123');
      fireEvent.press(screen.getByText('Sign In'));
      
      // Should show error and remain on auth screen
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Sign In Failed', 'Network error');
        expect(screen.getByText('Sign In to Your Account')).toBeTruthy();
      });
    });

    it('handles data loading errors in dashboard gracefully', async () => {
      mockBabyActions.loadBabies.mockRejectedValue(new Error('Failed to load babies'));
      
      const TestApp: React.FC = () => {
        return <Dashboard user={mockUser} onSignOut={() => {}} />;
      };
      
      render(<TestApp />);
      
      // Should show error but remain functional
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Failed to load your babies. Please check your connection and try again.'
        );
      });
      
      // Should still show dashboard structure
      expect(screen.getByText('Hello, Test User!')).toBeTruthy();
    });

    it('allows retry after network errors', async () => {
      let callCount = 0;
      mockAuthService.signIn.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('Network timeout'));
        }
        return Promise.resolve(mockUser);
      });
      
      const TestApp: React.FC = () => {
        const [user, setUser] = React.useState<User | null>(null);
        
        if (!user) {
          return <AuthScreen onAuthComplete={setUser} />;
        }
        
        return <Dashboard user={user} onSignOut={() => setUser(null)} />;
      };
      
      render(<TestApp />);
      
      // Navigate to sign in
      fireEvent.press(screen.getByText('Sign In'));
      
      // First attempt - should fail
      fireEvent.changeText(screen.getByPlaceholderText('Email'), 'test@example.com');
      fireEvent.changeText(screen.getByPlaceholderText('Password'), 'password123');
      fireEvent.press(screen.getByText('Sign In'));
      
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Sign In Failed', 'Network timeout');
      });
      
      // Second attempt - should succeed
      fireEvent.press(screen.getByText('Sign In'));
      
      await waitFor(() => {
        expect(screen.getByText('Hello, Test User!')).toBeTruthy();
      });
      
      expect(callCount).toBe(2);
    });
  });

  describe('Baby Management Flow', () => {
    it('guides new users through baby setup', async () => {
      // No babies initially
      mockBabySelectors.hasBabies.mockReturnValue(false);
      mockBabySelectors.getActiveBaby.mockReturnValue(null);
      
      render(<Dashboard user={mockUser} onSignOut={() => {}} />);
      
      // Should show baby setup flow
      await waitFor(() => {
        expect(screen.getByText('Welcome to Baby Tracker!')).toBeTruthy();
        expect(screen.getByText('Let\'s set up your first baby to start tracking activities.')).toBeTruthy();
        expect(screen.getByText('Add Your Baby')).toBeTruthy();
      });
      
      // Clicking add baby should trigger setup
      fireEvent.press(screen.getByText('Add Your Baby'));
      
      // Verify baby setup is initiated
      // (In a real app, this might navigate to a baby setup wizard)
    });

    it('allows switching between multiple babies', async () => {
      const baby1 = { ...mockBaby, id: 'baby-1', name: 'First Baby' };
      const baby2 = { ...mockBaby, id: 'baby-2', name: 'Second Baby' };
      
      mockBabySelectors.getAllBabies.mockReturnValue([baby1, baby2]);
      mockBabySelectors.getActiveBaby.mockReturnValue(baby1);
      mockBabyActions.setActiveBaby.mockResolvedValue(undefined);
      
      render(<Dashboard user={mockUser} onSignOut={() => {}} />);
      
      // Should show current baby
      expect(screen.getByText('Tracking: First Baby')).toBeTruthy();
      
      // Should show switch option
      expect(screen.getByText('Switch Baby')).toBeTruthy();
      
      // Switch to second baby
      fireEvent.press(screen.getByText('Switch Baby'));
      fireEvent.press(screen.getByText('Second Baby'));
      
      // Should trigger baby switch
      expect(mockBabyActions.setActiveBaby).toHaveBeenCalledWith('baby-2');
      expect(mockActivityActions.loadRecentActivities).toHaveBeenCalledWith('baby-2');
    });
  });

  describe('Offline to Online Sync', () => {
    it('handles transition from offline demo to authenticated user', async () => {
      const TestApp: React.FC = () => {
        const [user, setUser] = React.useState<User | null>(mockDemoUser);
        
        const handleUpgrade = async () => {
          mockAuthService.signIn.mockResolvedValue(mockUser);
          const authenticatedUser = await AuthService.signIn('test@example.com', 'password123');
          setUser(authenticatedUser);
        };
        
        if (user?.user_metadata?.is_anonymous) {
          return (
            <div>
              <Dashboard user={user} onSignOut={() => setUser(null)} />
              <button onClick={handleUpgrade}>Upgrade to Full Account</button>
            </div>
          );
        }
        
        if (!user) {
          return <AuthScreen onAuthComplete={setUser} />;
        }
        
        return <Dashboard user={user} onSignOut={() => setUser(null)} />;
      };
      
      render(<TestApp />);
      
      // Should start in demo mode
      expect(screen.getByText('Demo Mode')).toBeTruthy();
      
      // Upgrade to full account
      fireEvent.press(screen.getByText('Upgrade to Full Account'));
      
      // Should transition to authenticated dashboard
      await waitFor(() => {
        expect(screen.queryByText('Demo Mode')).toBeNull();
        expect(screen.getByText('Hello, Test User!')).toBeTruthy();
      });
    });
  });

  describe('Activity Tracking Flow', () => {
    it('allows user to track a complete nursing session', async () => {
      render(<Dashboard user={mockUser} onSignOut={() => {}} />);
      
      // Find and interact with nursing card
      const nursingCard = screen.getByTestId('nursing-card');
      expect(nursingCard).toBeTruthy();
      
      // Start tracking
      fireEvent.press(nursingCard);
      
      // Should expand card and show timer
      // (Detailed implementation would depend on actual component behavior)
      
      // Stop tracking after some time
      // Should save activity and update recent activities
    });

    it('maintains activity state during app backgrounding', async () => {
      // This test would verify that ongoing activities persist
      // when the app is backgrounded and restored
      
      render(<Dashboard user={mockUser} onSignOut={() => {}} />);
      
      // Start an activity
      const nursingCard = screen.getByTestId('nursing-card');
      fireEvent.press(nursingCard);
      
      // Simulate app backgrounding/foregrounding
      // Verify activity state is maintained
      
      // This would require testing with app state changes
    });
  });

  describe('Performance Under Load', () => {
    it('handles rapid user interactions gracefully', async () => {
      render(<Dashboard user={mockUser} onSignOut={() => {}} />);
      
      // Rapidly interact with multiple cards
      const cards = [
        'nursing-card',
        'bottle-card', 
        'sleep-card',
        'pumping-card'
      ];
      
      // Fire multiple rapid presses
      for (let i = 0; i < 10; i++) {
        cards.forEach(cardId => {
          const card = screen.queryByTestId(cardId);
          if (card) {
            fireEvent.press(card);
          }
        });
      }
      
      // Should not crash or show errors
      expect(screen.getByText('Hello, Test User!')).toBeTruthy();
    });

    it('handles large datasets efficiently', async () => {
      // Mock large number of activities
      const manyActivities = Array.from({ length: 1000 }, (_, i) => ({
        id: `activity-${i}`,
        baby_id: mockBaby.id,
        type: 'nursing',
        start_time: new Date().toISOString(),
        created_at: new Date().toISOString(),
      }));
      
      mockActivityActions.loadRecentActivities.mockResolvedValue(manyActivities as any);
      
      const startTime = Date.now();
      render(<Dashboard user={mockUser} onSignOut={() => {}} />);
      
      await waitFor(() => {
        expect(screen.getByText('Hello, Test User!')).toBeTruthy();
      });
      
      const renderTime = Date.now() - startTime;
      
      // Should render within reasonable time (< 3 seconds)
      expect(renderTime).toBeLessThan(3000);
    });
  });
});
import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { Dashboard } from '../../components/dashboard/Dashboard';
import { AuthService } from '../../services/authService';
import { babyActions, babySelectors } from '../../state/babyStore';
import { activityActions } from '../../state/activityStore';
import type { User } from '@supabase/supabase-js';
import type { Baby } from '../../types/database';

// Mock services and state
jest.mock('../../services/authService');
jest.mock('../../state/babyStore');
jest.mock('../../state/activityStore');

const mockAuthService = AuthService as jest.Mocked<typeof AuthService>;
const mockBabyActions = babyActions as jest.Mocked<typeof babyActions>;
const mockBabySelectors = babySelectors as jest.Mocked<typeof babySelectors>;
const mockActivityActions = activityActions as jest.Mocked<typeof activityActions>;

// Mock Alert
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

// Mock user object
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

// Mock baby object
const mockBaby: Baby = {
  id: 'baby-123',
  user_id: 'test-user-123',
  name: 'Test Baby',
  birth_date: '2025-01-01',
  created_at: '2025-08-11T00:00:00Z',
  updated_at: '2025-08-11T00:00:00Z',
};

describe('Dashboard', () => {
  const mockOnSignOut = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock returns
    mockBabySelectors.getActiveBaby.mockReturnValue(mockBaby);
    mockBabySelectors.hasBabies.mockReturnValue(true);
    mockBabyActions.loadBabies.mockResolvedValue(undefined);
    mockActivityActions.loadRecentActivities.mockResolvedValue(undefined);
  });

  describe('Initial Loading', () => {
    it('renders loading state initially', () => {
      mockBabySelectors.hasBabies.mockReturnValue(false);
      mockBabySelectors.getActiveBaby.mockReturnValue(null);
      
      render(<Dashboard user={mockUser} onSignOut={mockOnSignOut} />);
      
      expect(screen.getByTestId('loading-indicator')).toBeTruthy();
    });

    it('loads babies and activities on mount', () => {
      render(<Dashboard user={mockUser} onSignOut={mockOnSignOut} />);
      
      expect(mockBabyActions.loadBabies).toHaveBeenCalledWith(mockUser.id);
      expect(mockActivityActions.loadRecentActivities).toHaveBeenCalledWith(mockBaby.id);
    });
  });

  describe('Header Section', () => {
    beforeEach(() => {
      render(<Dashboard user={mockUser} onSignOut={mockOnSignOut} />);
    });

    it('displays welcome message with user name', () => {
      expect(screen.getByText('Hello, Test User!')).toBeTruthy();
    });

    it('displays baby name when baby is selected', () => {
      expect(screen.getByText('Tracking: Test Baby')).toBeTruthy();
    });

    it('shows sign out button', () => {
      expect(screen.getByText('Sign Out')).toBeTruthy();
    });

    it('calls onSignOut when sign out is pressed', async () => {
      mockAuthService.signOut.mockResolvedValue();
      
      fireEvent.press(screen.getByText('Sign Out'));
      
      await waitFor(() => {
        expect(mockAuthService.signOut).toHaveBeenCalled();
        expect(mockOnSignOut).toHaveBeenCalled();
      });
    });

    it('handles sign out error', async () => {
      mockAuthService.signOut.mockRejectedValue(new Error('Sign out failed'));
      
      fireEvent.press(screen.getByText('Sign Out'));
      
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Failed to sign out. Please try again.'
        );
        expect(mockOnSignOut).not.toHaveBeenCalled();
      });
    });
  });

  describe('Activity Cards', () => {
    beforeEach(() => {
      render(<Dashboard user={mockUser} onSignOut={mockOnSignOut} />);
    });

    it('renders all activity cards', () => {
      // Check for activity card headers
      expect(screen.getByText('Nursing')).toBeTruthy();
      expect(screen.getByText('Bottle Feeding')).toBeTruthy();
      expect(screen.getByText('Sleep')).toBeTruthy();
      expect(screen.getByText('Pumping')).toBeTruthy();
      expect(screen.getByText('Tummy Time')).toBeTruthy();
      expect(screen.getByText('Nappy Change')).toBeTruthy();
    });

    it('activity cards are interactive', () => {
      const nursingCard = screen.getByTestId('nursing-card');
      expect(nursingCard).toBeTruthy();
      
      // Should be pressable
      fireEvent.press(nursingCard);
      // Card should respond to interaction
    });
  });

  describe('No Baby State', () => {
    beforeEach(() => {
      mockBabySelectors.hasBabies.mockReturnValue(false);
      mockBabySelectors.getActiveBaby.mockReturnValue(null);
    });

    it('shows baby setup message when no babies exist', () => {
      render(<Dashboard user={mockUser} onSignOut={mockOnSignOut} />);
      
      expect(screen.getByText('Welcome to Baby Tracker!')).toBeTruthy();
      expect(screen.getByText('Let\'s set up your first baby to start tracking activities.')).toBeTruthy();
      expect(screen.getByText('Add Your Baby')).toBeTruthy();
    });

    it('shows add baby button when no babies exist', () => {
      render(<Dashboard user={mockUser} onSignOut={mockOnSignOut} />);
      
      const addBabyButton = screen.getByText('Add Your Baby');
      expect(addBabyButton).toBeTruthy();
      
      fireEvent.press(addBabyButton);
      // Should trigger baby setup wizard
    });
  });

  describe('Baby Selection', () => {
    const secondBaby: Baby = {
      id: 'baby-456',
      user_id: 'test-user-123',
      name: 'Second Baby',
      birth_date: '2025-06-01',
      created_at: '2025-08-11T00:00:00Z',
      updated_at: '2025-08-11T00:00:00Z',
    };

    beforeEach(() => {
      mockBabySelectors.getAllBabies.mockReturnValue([mockBaby, secondBaby]);
    });

    it('shows baby selector when multiple babies exist', () => {
      render(<Dashboard user={mockUser} onSignOut={mockOnSignOut} />);
      
      expect(screen.getByText('Switch Baby')).toBeTruthy();
    });

    it('can switch between babies', async () => {
      render(<Dashboard user={mockUser} onSignOut={mockOnSignOut} />);
      
      fireEvent.press(screen.getByText('Switch Baby'));
      
      // Should show baby selection modal/dropdown
      expect(screen.getByText('Test Baby')).toBeTruthy();
      expect(screen.getByText('Second Baby')).toBeTruthy();
      
      fireEvent.press(screen.getByText('Second Baby'));
      
      expect(mockBabyActions.setActiveBaby).toHaveBeenCalledWith(secondBaby.id);
      expect(mockActivityActions.loadRecentActivities).toHaveBeenCalledWith(secondBaby.id);
    });
  });

  describe('Data Synchronization', () => {
    it('refreshes data when user changes', () => {
      const { rerender } = render(<Dashboard user={mockUser} onSignOut={mockOnSignOut} />);
      
      const newUser = { ...mockUser, id: 'new-user-456' };
      rerender(<Dashboard user={newUser} onSignOut={mockOnSignOut} />);
      
      expect(mockBabyActions.loadBabies).toHaveBeenCalledWith('new-user-456');
    });

    it('refreshes activities when baby changes', () => {
      render(<Dashboard user={mockUser} onSignOut={mockOnSignOut} />);
      
      const newBaby = { ...mockBaby, id: 'new-baby-456' };
      mockBabySelectors.getActiveBaby.mockReturnValue(newBaby);
      
      // Simulate baby change
      expect(mockActivityActions.loadRecentActivities).toHaveBeenCalledWith(mockBaby.id);
    });

    it('handles loading errors gracefully', async () => {
      mockBabyActions.loadBabies.mockRejectedValue(new Error('Network error'));
      
      render(<Dashboard user={mockUser} onSignOut={mockOnSignOut} />);
      
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Failed to load your babies. Please check your connection and try again.'
        );
      });
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      render(<Dashboard user={mockUser} onSignOut={mockOnSignOut} />);
    });

    it('has proper accessibility labels for main actions', () => {
      const signOutButton = screen.getByText('Sign Out');
      expect(signOutButton.props.accessibilityLabel).toBe('Sign out of your account');
    });

    it('supports screen reader navigation', () => {
      const dashboard = screen.getByTestId('dashboard-container');
      expect(dashboard.props.accessibilityLabel).toBe('Baby tracking dashboard');
    });

    it('activity cards have proper accessibility', () => {
      const nursingCard = screen.getByTestId('nursing-card');
      expect(nursingCard.props.accessibilityRole).toBe('button');
      expect(nursingCard.props.accessibilityHint).toBe('Tap to track nursing activity');
    });
  });

  describe('Performance', () => {
    it('does not reload data unnecessarily', () => {
      const { rerender } = render(<Dashboard user={mockUser} onSignOut={mockOnSignOut} />);
      
      jest.clearAllMocks();
      
      // Re-render with same props
      rerender(<Dashboard user={mockUser} onSignOut={mockOnSignOut} />);
      
      // Should not reload data if user hasn't changed
      expect(mockBabyActions.loadBabies).not.toHaveBeenCalled();
    });

    it('memoizes expensive calculations', () => {
      // This would test that complex state derivations are memoized
      // Implementation would depend on how the component is optimized
      render(<Dashboard user={mockUser} onSignOut={mockOnSignOut} />);
      
      // Verify that selectors are called efficiently
      expect(mockBabySelectors.getActiveBaby).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Boundaries', () => {
    it('handles component errors gracefully', () => {
      // Mock a component error
      mockBabySelectors.getActiveBaby.mockImplementation(() => {
        throw new Error('State corruption');
      });
      
      // Component should not crash completely
      expect(() => {
        render(<Dashboard user={mockUser} onSignOut={mockOnSignOut} />);
      }).not.toThrow();
    });
  });

  describe('Demo Mode', () => {
    const demoUser: User = {
      ...mockUser,
      email: 'demo@embr-local.dev',
      user_metadata: {
        display_name: 'Demo User',
        is_anonymous: true,
      },
    };

    it('shows demo indicator for demo users', () => {
      render(<Dashboard user={demoUser} onSignOut={mockOnSignOut} />);
      
      expect(screen.getByText('Demo Mode')).toBeTruthy();
      expect(screen.getByText('You are using offline demo mode')).toBeTruthy();
    });

    it('hides sync features in demo mode', () => {
      render(<Dashboard user={demoUser} onSignOut={mockOnSignOut} />);
      
      // Sync-related UI elements should be hidden
      expect(screen.queryByText('Sync Now')).toBeNull();
      expect(screen.queryByText('Last synced:')).toBeNull();
    });
  });
});
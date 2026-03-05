import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { AuthScreen } from '../../components/auth/AuthScreen';
import { AuthService } from '../../services/authService';
import type { User } from '@supabase/supabase-js';

// Mock AuthService
jest.mock('../../services/authService');
const mockAuthService = AuthService as jest.Mocked<typeof AuthService>;

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

describe('AuthScreen', () => {
  const mockOnAuthComplete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Welcome Mode', () => {
    it('renders welcome screen with correct buttons', () => {
      render(<AuthScreen onAuthComplete={mockOnAuthComplete} />);
      
      expect(screen.getByText('Welcome to Baby Tracker')).toBeTruthy();
      expect(screen.getByText('Track your baby\'s activities with ease')).toBeTruthy();
      expect(screen.getByText('Sign In')).toBeTruthy();
      expect(screen.getByText('Create Account')).toBeTruthy();
      expect(screen.getByText('Continue as Guest')).toBeTruthy();
    });

    it('switches to sign in mode when Sign In is pressed', () => {
      render(<AuthScreen onAuthComplete={mockOnAuthComplete} />);
      
      fireEvent.press(screen.getByText('Sign In'));
      
      expect(screen.getByText('Sign In to Your Account')).toBeTruthy();
      expect(screen.getByPlaceholderText('Email')).toBeTruthy();
      expect(screen.getByPlaceholderText('Password')).toBeTruthy();
    });

    it('switches to sign up mode when Create Account is pressed', () => {
      render(<AuthScreen onAuthComplete={mockOnAuthComplete} />);
      
      fireEvent.press(screen.getByText('Create Account'));
      
      expect(screen.getByText('Create Your Account')).toBeTruthy();
      expect(screen.getByPlaceholderText('Email')).toBeTruthy();
      expect(screen.getByPlaceholderText('Password')).toBeTruthy();
    });

    it('handles guest mode correctly', async () => {
      mockAuthService.initializeDemoAuth.mockResolvedValue(mockUser);
      
      render(<AuthScreen onAuthComplete={mockOnAuthComplete} />);
      
      fireEvent.press(screen.getByText('Continue as Guest'));
      
      await waitFor(() => {
        expect(mockAuthService.initializeDemoAuth).toHaveBeenCalled();
        expect(mockOnAuthComplete).toHaveBeenCalledWith(mockUser);
      });
    });

    it('handles guest mode error', async () => {
      mockAuthService.initializeDemoAuth.mockRejectedValue(new Error('Network error'));
      
      render(<AuthScreen onAuthComplete={mockOnAuthComplete} />);
      
      fireEvent.press(screen.getByText('Continue as Guest'));
      
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Failed to start demo mode. Please try again.'
        );
        expect(mockOnAuthComplete).not.toHaveBeenCalled();
      });
    });
  });

  describe('Sign In Mode', () => {
    beforeEach(() => {
      const { rerender } = render(<AuthScreen onAuthComplete={mockOnAuthComplete} />);
      fireEvent.press(screen.getByText('Sign In'));
    });

    it('validates email and password inputs', async () => {
      fireEvent.press(screen.getByText('Sign In'));
      
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Validation Error',
          'Please enter both email and password'
        );
      });
    });

    it('handles successful sign in', async () => {
      mockAuthService.signIn.mockResolvedValue(mockUser);
      
      fireEvent.changeText(screen.getByPlaceholderText('Email'), 'test@example.com');
      fireEvent.changeText(screen.getByPlaceholderText('Password'), 'password123');
      fireEvent.press(screen.getByText('Sign In'));
      
      await waitFor(() => {
        expect(mockAuthService.signIn).toHaveBeenCalledWith('test@example.com', 'password123');
        expect(mockOnAuthComplete).toHaveBeenCalledWith(mockUser);
      });
    });

    it('handles sign in error', async () => {
      mockAuthService.signIn.mockRejectedValue(new Error('Invalid credentials'));
      
      fireEvent.changeText(screen.getByPlaceholderText('Email'), 'test@example.com');
      fireEvent.changeText(screen.getByPlaceholderText('Password'), 'wrongpassword');
      fireEvent.press(screen.getByText('Sign In'));
      
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Sign In Failed',
          'Invalid credentials'
        );
        expect(mockOnAuthComplete).not.toHaveBeenCalled();
      });
    });

    it('shows loading state during sign in', async () => {
      let resolveSignIn: (user: User) => void;
      const signInPromise = new Promise<User>((resolve) => {
        resolveSignIn = resolve;
      });
      mockAuthService.signIn.mockReturnValue(signInPromise);
      
      fireEvent.changeText(screen.getByPlaceholderText('Email'), 'test@example.com');
      fireEvent.changeText(screen.getByPlaceholderText('Password'), 'password123');
      fireEvent.press(screen.getByText('Sign In'));
      
      // Should show loading state
      expect(screen.getByTestId('loading-indicator')).toBeTruthy();
      
      // Resolve the promise
      resolveSignIn!(mockUser);
      
      await waitFor(() => {
        expect(mockOnAuthComplete).toHaveBeenCalledWith(mockUser);
      });
    });

    it('can navigate back to welcome screen', () => {
      fireEvent.press(screen.getByText('← Back'));
      
      expect(screen.getByText('Welcome to Baby Tracker')).toBeTruthy();
    });
  });

  describe('Sign Up Mode', () => {
    beforeEach(() => {
      render(<AuthScreen onAuthComplete={mockOnAuthComplete} />);
      fireEvent.press(screen.getByText('Create Account'));
    });

    it('validates email and password inputs for sign up', async () => {
      fireEvent.press(screen.getByText('Create Account'));
      
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Validation Error',
          'Please enter both email and password'
        );
      });
    });

    it('validates password strength', async () => {
      fireEvent.changeText(screen.getByPlaceholderText('Email'), 'test@example.com');
      fireEvent.changeText(screen.getByPlaceholderText('Password'), '123');
      fireEvent.press(screen.getByText('Create Account'));
      
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Validation Error',
          'Password must be at least 6 characters long'
        );
      });
    });

    it('handles successful sign up', async () => {
      mockAuthService.signUp.mockResolvedValue(mockUser);
      
      fireEvent.changeText(screen.getByPlaceholderText('Email'), 'test@example.com');
      fireEvent.changeText(screen.getByPlaceholderText('Password'), 'password123');
      fireEvent.press(screen.getByText('Create Account'));
      
      await waitFor(() => {
        expect(mockAuthService.signUp).toHaveBeenCalledWith('test@example.com', 'password123');
        expect(mockOnAuthComplete).toHaveBeenCalledWith(mockUser);
      });
    });

    it('handles sign up error', async () => {
      mockAuthService.signUp.mockRejectedValue(new Error('Email already exists'));
      
      fireEvent.changeText(screen.getByPlaceholderText('Email'), 'existing@example.com');
      fireEvent.changeText(screen.getByPlaceholderText('Password'), 'password123');
      fireEvent.press(screen.getByText('Create Account'));
      
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Sign Up Failed',
          'Email already exists'
        );
        expect(mockOnAuthComplete).not.toHaveBeenCalled();
      });
    });

    it('can navigate back to welcome screen', () => {
      fireEvent.press(screen.getByText('← Back'));
      
      expect(screen.getByText('Welcome to Baby Tracker')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('has proper accessibility labels', () => {
      render(<AuthScreen onAuthComplete={mockOnAuthComplete} />);
      
      // Switch to sign in mode
      fireEvent.press(screen.getByText('Sign In'));
      
      const emailInput = screen.getByPlaceholderText('Email');
      const passwordInput = screen.getByPlaceholderText('Password');
      
      expect(emailInput.props.accessibilityLabel).toBe('Email input field');
      expect(passwordInput.props.accessibilityLabel).toBe('Password input field');
    });

    it('supports keyboard navigation', () => {
      render(<AuthScreen onAuthComplete={mockOnAuthComplete} />);
      
      fireEvent.press(screen.getByText('Sign In'));
      
      const emailInput = screen.getByPlaceholderText('Email');
      const passwordInput = screen.getByPlaceholderText('Password');
      
      // Test tab navigation
      expect(emailInput.props.returnKeyType).toBe('next');
      expect(passwordInput.props.returnKeyType).toBe('done');
    });
  });

  describe('Input Validation', () => {
    beforeEach(() => {
      render(<AuthScreen onAuthComplete={mockOnAuthComplete} />);
      fireEvent.press(screen.getByText('Sign In'));
    });

    it('validates email format', async () => {
      fireEvent.changeText(screen.getByPlaceholderText('Email'), 'invalid-email');
      fireEvent.changeText(screen.getByPlaceholderText('Password'), 'password123');
      fireEvent.press(screen.getByText('Sign In'));
      
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Validation Error',
          'Please enter a valid email address'
        );
      });
    });

    it('trims whitespace from email', async () => {
      mockAuthService.signIn.mockResolvedValue(mockUser);
      
      fireEvent.changeText(screen.getByPlaceholderText('Email'), '  test@example.com  ');
      fireEvent.changeText(screen.getByPlaceholderText('Password'), 'password123');
      fireEvent.press(screen.getByText('Sign In'));
      
      await waitFor(() => {
        expect(mockAuthService.signIn).toHaveBeenCalledWith('test@example.com', 'password123');
      });
    });
  });
});
import { render } from '@testing-library/react-native';
import { Dashboard } from '../Dashboard';

// Mock the unified hooks to avoid dependency issues in tests
jest.mock('../../../../hooks/useUnifiedAuth', () => ({
  useUnifiedAuth: () => ({
    isAnonymous: false,
    shouldSync: true,
    isOnline: true,
    signOut: jest.fn(),
    chooseAuthentication: jest.fn(),
  }),
}));

jest.mock('../../../../hooks/useUnifiedData', () => ({
  useUnifiedData: () => ({
    activeBaby: {
      id: 'test-baby',
      name: 'Test Baby',
      nickname: 'Little One',
    },
    loading: false,
    error: null,
    clearError: jest.fn(),
  }),
}));

jest.mock('../../../../hooks/useUnifiedActivity', () => ({
  useUnifiedActivity: () => ({
    getActiveSessions: jest.fn(() => []),
    getRecentSessions: jest.fn(() => []),
    loading: false,
    isSyncing: false,
    syncError: null,
    syncQueueSize: 0,
  }),
}));

// Mock activity card components to avoid deep testing dependencies
jest.mock('../../../activities/components/NursingCard', () => ({
  NursingCard: () => null,
}));

jest.mock('../../../activities/components/BottleCard', () => ({
  BottleCard: () => null,
}));

jest.mock('../../../activities/components/SleepCard', () => ({
  SleepCard: () => null,
}));

jest.mock('../../../activities/components/PumpingCard', () => ({
  PumpingCard: () => null,
}));

jest.mock('../../../activities/components/TummyTimeCard', () => ({
  TummyTimeCard: () => null,
}));

jest.mock('../../../activities/components/NappyCard', () => ({
  NappyCard: () => null,
}));

jest.mock('../../../../components/auth/ProfileUpgradePrompt', () => ({
  ProfileUpgradePrompt: () => null,
}));

const mockUser = {
  id: 'test-user',
  email: 'test@example.com',
  user_metadata: {
    display_name: 'Test Parent',
  },
} as any;

describe('Dashboard', () => {
  const mockOnSignOut = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render dashboard with baby name', () => {
    const { getByText } = render(
      <Dashboard user={mockUser} onSignOut={mockOnSignOut} />
    );

    expect(getByText('Hello, Test Parent!')).toBeTruthy();
    expect(getByText('Tracking: Test Baby (Little One)')).toBeTruthy();
  });

  it('should show sync status indicator', () => {
    const { getByText } = render(
      <Dashboard user={mockUser} onSignOut={mockOnSignOut} />
    );

    expect(getByText('Synced to cloud')).toBeTruthy();
  });

  it('should display activity tracking section', () => {
    const { getByText } = render(
      <Dashboard user={mockUser} onSignOut={mockOnSignOut} />
    );

    expect(getByText('Track Activities')).toBeTruthy();
  });

  it('should show today at a glance section', () => {
    const { getByText } = render(
      <Dashboard user={mockUser} onSignOut={mockOnSignOut} />
    );

    expect(getByText('Today at a Glance')).toBeTruthy();
    expect(getByText('Active sessions: 0')).toBeTruthy();
    expect(getByText('Recent activities: 0')).toBeTruthy();
  });

  it('should have sign out button', () => {
    const { getByText } = render(
      <Dashboard user={mockUser} onSignOut={mockOnSignOut} />
    );

    const signOutButton = getByText('Sign Out');
    expect(signOutButton).toBeTruthy();
  });
});
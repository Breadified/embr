import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { NursingCard } from '../components/NursingCard';
import { useUnifiedActivity } from '../../../hooks/useUnifiedActivity';

// Mock dependencies
jest.mock('../../../hooks/useUnifiedActivity');
jest.mock('react-native-reanimated', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    default: {
      View: RN.View,
      useSharedValue: jest.fn(() => ({ value: 0 })),
      useAnimatedStyle: jest.fn(() => ({})),
      withTiming: jest.fn((value) => value),
      interpolate: jest.fn(() => 1),
    },
    useSharedValue: jest.fn(() => ({ value: 0 })),
    useAnimatedStyle: jest.fn(() => ({})),
    withTiming: jest.fn((value) => value),
    interpolate: jest.fn(() => 1),
  };
});

const mockUseUnifiedActivity = useUnifiedActivity as jest.MockedFunction<typeof useUnifiedActivity>;

describe('NursingCard (Activities)', () => {
  const mockBabyId = 'test-baby-123';
  const mockActivityData = {
    sessions: {},
    activeSessions: {},
    startSession: jest.fn(),
    endSession: jest.fn(),
    updateSessionMetadata: jest.fn(),
    createQuickLog: jest.fn(),
    allSessions: [],
    activeSessionsList: [],
    getActiveSessions: jest.fn().mockReturnValue([]),
    getRecentSessions: jest.fn().mockReturnValue([]),
    getLastActivity: jest.fn().mockReturnValue(null),
    loading: false,
    error: null as string | null,
    isSyncing: false,
    syncError: null as string | null,
    lastSyncTime: null as number | null,
    syncQueueSize: 0,
    clearError: jest.fn(() => {}),
  };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    
    const mockSession = {
      id: 'session-123',
      baby_id: mockBabyId,
      activity_type: 'nursing' as const,
      started_at: new Date().toISOString(),
      ended_at: null,
      total_duration_seconds: 0,
      metadata: {},
      sync_status: 'synced' as const,
      client_id: 'test-client-id',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      notes: null,
      sync_error: null,
      sync_retry_count: null,
      last_sync_attempt: null,
    };
    
    mockActivityData.startSession.mockResolvedValue(mockSession);
    mockActivityData.updateSessionMetadata.mockResolvedValue({ ...mockSession, metadata: {} });
    mockActivityData.endSession.mockResolvedValue({ ...mockSession, ended_at: new Date().toISOString(), total_duration_seconds: 300 });

    mockUseUnifiedActivity.mockReturnValue(mockActivityData as any);
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('Initial Render', () => {
    it('renders nursing card with dual timer setup', () => {
      const { getByText, getAllByText } = render(
        <NursingCard babyId={mockBabyId} />
      );

      expect(getByText('Nursing Session')).toBeTruthy();
      expect(getByText('Left Breast')).toBeTruthy();
      expect(getByText('Right Breast')).toBeTruthy();
      expect(getAllByText('00:00')).toHaveLength(2); // Two timers
      expect(getAllByText('Start')).toHaveLength(2); // Two start buttons
    });

    it('renders session controls', () => {
      const { getByText } = render(
        <NursingCard babyId={mockBabyId} />
      );

      expect(getByText('Start Session')).toBeTruthy();
      expect(getByText('Total Time: 00:00')).toBeTruthy();
    });
  });

  describe('Dual Timer Functionality', () => {
    it('starts left breast timer and creates session', async () => {
      const { getAllByText } = render(
        <NursingCard babyId={mockBabyId} />
      );

      const leftStartButton = getAllByText('Start')[0]; // First start button (left breast)

      await act(async () => {
        fireEvent.press(leftStartButton);
      });

      await waitFor(() => {
        expect(mockActivityData.startSession).toHaveBeenCalledWith({
          babyId: mockBabyId,
          activityType: 'nursing',
          metadata: {
            side: 'left',
            comfort: 3,
            difficulty: 'normal'
          },
        });
      });
    });

    it('switches between breasts correctly', async () => {
      const { getAllByText } = render(
        <NursingCard babyId={mockBabyId} />
      );

      // Start left breast
      await act(async () => {
        fireEvent.press(getAllByText('Start')[0]);
      });

      // Advance time for left breast
      act(() => {
        jest.advanceTimersByTime(2 * 60 * 1000); // 2 minutes
      });

      // Start right breast (should pause left automatically)
      await act(async () => {
        fireEvent.press(getAllByText('Start')[1]);
      });

      await waitFor(() => {
        expect(mockActivityData.updateSessionMetadata).toHaveBeenCalledWith(
          'session-123',
          expect.objectContaining({
            leftBreastDuration: 120, // 2 minutes in seconds
            rightBreastDuration: 0,
            currentSide: 'right',
          })
        );
      });
    });

    it('calculates total duration correctly', async () => {
      const { getAllByText, getByText } = render(
        <NursingCard babyId={mockBabyId} />
      );

      // Start left breast
      await act(async () => {
        fireEvent.press(getAllByText('Start')[0]);
      });

      // Run for 3 minutes
      act(() => {
        jest.advanceTimersByTime(3 * 60 * 1000);
      });

      // Switch to right breast
      await act(async () => {
        fireEvent.press(getAllByText('Start')[1]);
      });

      // Run right breast for 2 minutes
      act(() => {
        jest.advanceTimersByTime(2 * 60 * 1000);
      });

      // Total should be 5 minutes
      await waitFor(() => {
        expect(getByText('Total Time: 05:00')).toBeTruthy();
      });
    });
  });

  describe('Session Management', () => {
    it('ends session correctly', async () => {
      const onSessionComplete = jest.fn();
      const { getAllByText, getByText } = render(
        <NursingCard 
          babyId={mockBabyId} 
          onSessionComplete={onSessionComplete}
        />
      );

      // Start and run a session
      await act(async () => {
        fireEvent.press(getAllByText('Start')[0]);
      });

      act(() => {
        jest.advanceTimersByTime(5 * 60 * 1000); // 5 minutes
      });

      // End session
      await act(async () => {
        fireEvent.press(getByText('End Session'));
      });

      await waitFor(() => {
        expect(mockActivityData.endSession).toHaveBeenCalledWith(
          'session-123',
          expect.objectContaining({
            leftBreastDuration: 300, // 5 minutes
            rightBreastDuration: 0,
            totalDuration: 300,
          })
        );
      });

      expect(onSessionComplete).toHaveBeenCalled();
    });

    it('pauses active timer correctly', async () => {
      const { getAllByText, getByText } = render(
        <NursingCard babyId={mockBabyId} />
      );

      // Start left breast
      await act(async () => {
        fireEvent.press(getAllByText('Start')[0]);
      });

      // Should show pause button
      await waitFor(() => {
        expect(getByText('Pause')).toBeTruthy();
      });

      // Pause the timer
      await act(async () => {
        fireEvent.press(getByText('Pause'));
      });

      // Should show resume button
      await waitFor(() => {
        expect(getByText('Resume')).toBeTruthy();
      });
    });

    it('handles notes input correctly', async () => {
      const { getByPlaceholderText, getAllByText, getByText } = render(
        <NursingCard babyId={mockBabyId} />
      );

      const notesInput = getByPlaceholderText('Add notes about nursing session...');

      await act(async () => {
        fireEvent.changeText(notesInput, 'Baby nursed well on left side');
      });

      // Start session
      await act(async () => {
        fireEvent.press(getAllByText('Start')[0]);
      });

      // End session
      await act(async () => {
        fireEvent.press(getByText('End Session'));
      });

      await waitFor(() => {
        expect(mockActivityData.endSession).toHaveBeenCalledWith(
          'session-123',
          expect.objectContaining({
            notes: 'Baby nursed well on left side',
          })
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('handles session creation failure', async () => {
      mockActivityData.startSession.mockRejectedValue(new Error('Network error'));
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const { getAllByText } = render(
        <NursingCard babyId={mockBabyId} />
      );

      await act(async () => {
        fireEvent.press(getAllByText('Start')[0]);
      });

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to start nursing session:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });

    it('handles session update failure when switching sides', async () => {
      mockActivityData.updateSessionMetadata.mockRejectedValue(new Error('Update failed'));
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const { getAllByText } = render(
        <NursingCard babyId={mockBabyId} />
      );

      // Start left breast
      await act(async () => {
        fireEvent.press(getAllByText('Start')[0]);
      });

      // Try to switch to right breast
      await act(async () => {
        fireEvent.press(getAllByText('Start')[1]);
      });

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to update nursing session:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });
  });

  describe('State Management', () => {
    it('resets form after session completion', async () => {
      const { getByPlaceholderText, getAllByText, getByText } = render(
        <NursingCard babyId={mockBabyId} />
      );

      // Add notes
      await act(async () => {
        fireEvent.changeText(getByPlaceholderText('Add notes about nursing session...'), 'Test notes');
      });

      // Start and end session
      await act(async () => {
        fireEvent.press(getAllByText('Start')[0]);
      });

      await act(async () => {
        fireEvent.press(getByText('End Session'));
      });

      // Notes should be cleared
      await waitFor(() => {
        expect(getByPlaceholderText('Add notes about nursing session...')).toBeTruthy();
      });
    });

    it('handles disabled prop correctly', () => {
      const { getAllByText, getByText } = render(
        <NursingCard babyId={mockBabyId} disabled={true} />
      );

      // All start buttons should be disabled
      const startButtons = getAllByText('Start');
      startButtons.forEach(button => {
        expect(button.props.disabled).toBe(true);
      });

      expect(getByText('Start Session').props.disabled).toBe(true);
    });
  });

  describe('Visual Indicators', () => {
    it('shows active side indicator', async () => {
      const { getAllByText, getByText } = render(
        <NursingCard babyId={mockBabyId} />
      );

      // Start left breast
      await act(async () => {
        fireEvent.press(getAllByText('Start')[0]);
      });

      // Should show left breast as active
      await waitFor(() => {
        expect(getByText('● Left Breast')).toBeTruthy();
      });

      // Switch to right breast
      await act(async () => {
        fireEvent.press(getAllByText('Start')[1]);
      });

      // Should show right breast as active
      await waitFor(() => {
        expect(getByText('● Right Breast')).toBeTruthy();
      });
    });

    it('displays duration in correct format', async () => {
      const { getAllByText } = render(
        <NursingCard babyId={mockBabyId} />
      );

      // Start left breast
      await act(async () => {
        fireEvent.press(getAllByText('Start')[0]);
      });

      // Advance time to 1 minute 30 seconds
      act(() => {
        jest.advanceTimersByTime(90 * 1000);
      });

      await waitFor(() => {
        expect(getAllByText('01:30')[0]).toBeTruthy(); // Left breast timer
      });
    });
  });
});
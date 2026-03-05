import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { SleepCard } from '../components/SleepCard';
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

describe('SleepCard (Activities)', () => {
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
    
    mockActivityData.startSession.mockResolvedValue({
      id: 'session-123',
      baby_id: mockBabyId,
      activity_type: 'sleep',
      started_at: new Date().toISOString(),
      ended_at: null,
      total_duration_seconds: 0,
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      client_id: 'client-123',
      sync_status: 'synced',
      notes: null,
      sync_error: null,
      sync_retry_count: null,
      last_sync_attempt: null,
    });
    
    mockActivityData.updateSessionMetadata.mockResolvedValue({
      id: 'session-123',
      baby_id: mockBabyId,
      activity_type: 'sleep',
      started_at: new Date().toISOString(),
      ended_at: null,
      total_duration_seconds: 0,
      metadata: { interruptions: 1 },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      client_id: 'client-123',
      sync_status: 'synced',
      notes: null,
      sync_error: null,
      sync_retry_count: null,
      last_sync_attempt: null,
    });
    
    mockActivityData.endSession.mockResolvedValue({
      id: 'session-123',
      baby_id: mockBabyId,
      activity_type: 'sleep',
      started_at: new Date().toISOString(),
      ended_at: new Date().toISOString(),
      total_duration_seconds: 3600,
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      client_id: 'client-123',
      sync_status: 'synced',
      notes: null,
      sync_error: null,
      sync_retry_count: null,
      last_sync_attempt: null,
    });

    mockUseUnifiedActivity.mockReturnValue(mockActivityData as any);
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('Initial Render', () => {
    it('renders sleep card with timer', () => {
      const { getByText } = render(
        <SleepCard babyId={mockBabyId} />
      );

      expect(getByText('Sleep Session')).toBeTruthy();
      expect(getByText('00:00')).toBeTruthy(); // Timer display
      expect(getByText('Start')).toBeTruthy(); // Start button
      expect(getByText('Crib')).toBeTruthy(); // Default sleep location
    });

    it('renders sleep location options', () => {
      const { getByText } = render(
        <SleepCard babyId={mockBabyId} />
      );

      expect(getByText('Crib')).toBeTruthy(); // Default location
      // Other options would appear in picker/dropdown
    });

    it('renders sleep quality controls', () => {
      const { getByText } = render(
        <SleepCard babyId={mockBabyId} />
      );

      expect(getByText('Sleep Quality')).toBeTruthy();
      expect(getByText('Good')).toBeTruthy(); // Default quality
    });
  });

  describe('Sleep Session Management', () => {
    it('starts sleep session correctly', async () => {
      const { getByText } = render(
        <SleepCard babyId={mockBabyId} />
      );

      await act(async () => {
        fireEvent.press(getByText('Start'));
      });

      await waitFor(() => {
        expect(mockActivityData.startSession).toHaveBeenCalledWith({
          babyId: mockBabyId,
          activityType: 'sleep',
          metadata: {
            location: 'crib',
            quality: 'good',
            notes: '',
            interruptions: 0,
          },
        });
      });

      expect(getByText('Pause')).toBeTruthy();
      expect(getByText('Stop')).toBeTruthy();
    });

    it('tracks sleep duration correctly', async () => {
      const { getByText } = render(
        <SleepCard babyId={mockBabyId} />
      );

      // Start sleep
      await act(async () => {
        fireEvent.press(getByText('Start'));
      });

      // Advance time by 2 hours
      act(() => {
        jest.advanceTimersByTime(2 * 60 * 60 * 1000);
      });

      await waitFor(() => {
        expect(getByText('02:00:00')).toBeTruthy(); // 2 hours displayed
      });
    });

    it('handles sleep interruptions', async () => {
      const { getByText } = render(
        <SleepCard babyId={mockBabyId} />
      );

      // Start sleep
      await act(async () => {
        fireEvent.press(getByText('Start'));
      });

      // Mark interruption
      const interruptButton = getByText('Mark Interruption');
      await act(async () => {
        fireEvent.press(interruptButton);
      });

      await waitFor(() => {
        expect(getByText('Interruptions: 1')).toBeTruthy();
      });

      await waitFor(() => {
        expect(mockActivityData.updateSessionMetadata).toHaveBeenCalledWith(
          'session-123',
          expect.objectContaining({
            interruptions: 1,
          })
        );
      });
    });

    it('completes sleep session with metadata', async () => {
      const onSessionComplete = jest.fn();
      const { getByText, getByPlaceholderText } = render(
        <SleepCard 
          babyId={mockBabyId} 
          onSessionComplete={onSessionComplete}
        />
      );

      // Add notes
      await act(async () => {
        fireEvent.changeText(getByPlaceholderText('Add notes about sleep...'), 'Slept peacefully');
      });

      // Start sleep
      await act(async () => {
        fireEvent.press(getByText('Start'));
      });

      // Run for 1 hour
      act(() => {
        jest.advanceTimersByTime(60 * 60 * 1000);
      });

      // End sleep
      await act(async () => {
        fireEvent.press(getByText('Stop'));
      });

      await waitFor(() => {
        expect(mockActivityData.endSession).toHaveBeenCalledWith(
          'session-123',
          expect.objectContaining({
            location: 'crib',
            quality: 'good',
            notes: 'Slept peacefully',
            interruptions: 0,
          })
        );
      });

      expect(onSessionComplete).toHaveBeenCalled();
    });
  });

  describe('Sleep Location Management', () => {
    it('changes sleep location', async () => {
      const { getByText } = render(
        <SleepCard babyId={mockBabyId} />
      );

      // Change to parent's bed
      await act(async () => {
        fireEvent.press(getByText('Crib'));
      });

      const parentBedOption = getByText("Parent's Bed");
      await act(async () => {
        fireEvent.press(parentBedOption);
      });

      // Start session to verify updated metadata
      await act(async () => {
        fireEvent.press(getByText('Start'));
      });

      await waitFor(() => {
        expect(mockActivityData.startSession).toHaveBeenCalledWith(
          expect.objectContaining({
            metadata: expect.objectContaining({
              location: 'parents_bed',
            }),
          })
        );
      });
    });

    it('shows all sleep location options', () => {
      const { getByText } = render(
        <SleepCard babyId={mockBabyId} />
      );

      // Open location picker
      fireEvent.press(getByText('Crib'));

      expect(getByText('Bassinet')).toBeTruthy();
      expect(getByText('Stroller')).toBeTruthy();
      expect(getByText('Car Seat')).toBeTruthy();
      expect(getByText("Parent's Bed")).toBeTruthy();
    });
  });

  describe('Sleep Quality Assessment', () => {
    it('changes sleep quality rating', async () => {
      const { getByText } = render(
        <SleepCard babyId={mockBabyId} />
      );

      // Change to excellent quality
      await act(async () => {
        fireEvent.press(getByText('Good'));
      });

      const excellentOption = getByText('Excellent');
      await act(async () => {
        fireEvent.press(excellentOption);
      });

      // Start session to verify updated metadata
      await act(async () => {
        fireEvent.press(getByText('Start'));
      });

      await waitFor(() => {
        expect(mockActivityData.startSession).toHaveBeenCalledWith(
          expect.objectContaining({
            metadata: expect.objectContaining({
              quality: 'excellent',
            }),
          })
        );
      });
    });

    it('shows all sleep quality options', () => {
      const { getByText } = render(
        <SleepCard babyId={mockBabyId} />
      );

      // Open quality picker
      fireEvent.press(getByText('Good'));

      expect(getByText('Poor')).toBeTruthy();
      expect(getByText('Fair')).toBeTruthy();
      expect(getByText('Good')).toBeTruthy();
      expect(getByText('Excellent')).toBeTruthy();
    });
  });

  describe('Pause and Resume Functionality', () => {
    it('pauses and resumes sleep session correctly', async () => {
      const { getByText } = render(
        <SleepCard babyId={mockBabyId} />
      );

      // Start sleep
      await act(async () => {
        fireEvent.press(getByText('Start'));
      });

      // Pause sleep
      await act(async () => {
        fireEvent.press(getByText('Pause'));
      });

      expect(getByText('Resume')).toBeTruthy();

      // Resume sleep
      await act(async () => {
        fireEvent.press(getByText('Resume'));
      });

      expect(getByText('Pause')).toBeTruthy();
      expect(getByText('Stop')).toBeTruthy();
    });

    it('tracks total sleep time across pauses', async () => {
      const { getByText } = render(
        <SleepCard babyId={mockBabyId} />
      );

      // Start sleep
      await act(async () => {
        fireEvent.press(getByText('Start'));
      });

      // Sleep for 30 minutes
      act(() => {
        jest.advanceTimersByTime(30 * 60 * 1000);
      });

      // Pause
      await act(async () => {
        fireEvent.press(getByText('Pause'));
      });

      // Wait 10 minutes while paused (shouldn't count)
      act(() => {
        jest.advanceTimersByTime(10 * 60 * 1000);
      });

      // Resume and sleep 15 more minutes
      await act(async () => {
        fireEvent.press(getByText('Resume'));
      });

      act(() => {
        jest.advanceTimersByTime(15 * 60 * 1000);
      });

      // Total should be 45 minutes (30 + 15)
      await waitFor(() => {
        expect(getByText('00:45:00')).toBeTruthy();
      });
    });
  });

  describe('Error Handling', () => {
    it('handles session creation failure', async () => {
      mockActivityData.startSession.mockRejectedValue(new Error('Network error'));
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const { getByText } = render(
        <SleepCard babyId={mockBabyId} />
      );

      await act(async () => {
        fireEvent.press(getByText('Start'));
      });

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to start sleep session:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });

    it('handles interruption update failure', async () => {
      mockActivityData.updateSessionMetadata.mockRejectedValue(new Error('Update failed'));
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const { getByText } = render(
        <SleepCard babyId={mockBabyId} />
      );

      // Start sleep
      await act(async () => {
        fireEvent.press(getByText('Start'));
      });

      // Try to mark interruption
      await act(async () => {
        fireEvent.press(getByText('Mark Interruption'));
      });

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to update sleep session:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Component State Management', () => {
    it('resets form after session completion', async () => {
      const { getByText, getByPlaceholderText } = render(
        <SleepCard babyId={mockBabyId} />
      );

      // Modify values
      await act(async () => {
        fireEvent.changeText(getByPlaceholderText('Add notes about sleep...'), 'Test notes');
      });

      // Start and stop session
      await act(async () => {
        fireEvent.press(getByText('Start'));
      });

      await act(async () => {
        fireEvent.press(getByText('Stop'));
      });

      // Form should reset
      await waitFor(() => {
        expect(getByPlaceholderText('Add notes about sleep...')).toBeTruthy();
      });
    });

    it('handles disabled prop correctly', () => {
      const { getByText } = render(
        <SleepCard babyId={mockBabyId} disabled={true} />
      );

      const startButton = getByText('Start');
      expect(startButton.props.disabled).toBe(true);
    });

    it('disables form inputs while timer is running', async () => {
      const { getByText, getByPlaceholderText } = render(
        <SleepCard babyId={mockBabyId} />
      );

      // Start sleep
      await act(async () => {
        fireEvent.press(getByText('Start'));
      });

      // Notes input should be disabled
      const notesInput = getByPlaceholderText('Add notes about sleep...');
      expect(notesInput.props.editable).toBe(false);
    });
  });

  describe('Night Mode Features', () => {
    it('tracks day vs night sleep patterns', async () => {
      const { getByText } = render(
        <SleepCard babyId={mockBabyId} />
      );

      // Start sleep during night hours (simulated)
      const mockNightTime = new Date();
      mockNightTime.setHours(22, 0, 0, 0); // 10 PM
      jest.spyOn(Date, 'now').mockReturnValue(mockNightTime.getTime());

      await act(async () => {
        fireEvent.press(getByText('Start'));
      });

      await waitFor(() => {
        expect(mockActivityData.startSession).toHaveBeenCalledWith(
          expect.objectContaining({
            metadata: expect.objectContaining({
              timeOfDay: 'night',
            }),
          })
        );
      });

      jest.restoreAllMocks();
    });
  });
});
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { TummyTimeCard } from '../components/TummyTimeCard';
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

describe('TummyTimeCard (Activities)', () => {
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
      activity_type: 'tummy_time',
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
      activity_type: 'tummy_time',
      started_at: new Date().toISOString(),
      ended_at: null,
      total_duration_seconds: 0,
      metadata: { mood: 'tired' },
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
      activity_type: 'tummy_time',
      started_at: new Date().toISOString(),
      ended_at: new Date().toISOString(),
      total_duration_seconds: 300,
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
    it('renders tummy time card with timer', () => {
      const { getByText } = render(
        <TummyTimeCard babyId={mockBabyId} />
      );

      expect(getByText('Tummy Time')).toBeTruthy();
      expect(getByText('00:00')).toBeTruthy(); // Timer display
      expect(getByText('Start')).toBeTruthy(); // Start button
      expect(getByText('Floor')).toBeTruthy(); // Default location
    });

    it('renders milestone tracking options', () => {
      const { getByText } = render(
        <TummyTimeCard babyId={mockBabyId} />
      );

      expect(getByText('Track Milestones')).toBeTruthy();
      expect(getByText('Head Up')).toBeTruthy();
      expect(getByText('Rolling Over')).toBeTruthy();
      expect(getByText('Pushing Up')).toBeTruthy();
    });

    it('shows baby mood tracking', () => {
      const { getByText } = render(
        <TummyTimeCard babyId={mockBabyId} />
      );

      expect(getByText('Baby Mood')).toBeTruthy();
      expect(getByText('Happy')).toBeTruthy(); // Default mood
    });
  });

  describe('Tummy Time Session Management', () => {
    it('starts tummy time session correctly', async () => {
      const { getByText } = render(
        <TummyTimeCard babyId={mockBabyId} />
      );

      await act(async () => {
        fireEvent.press(getByText('Start'));
      });

      await waitFor(() => {
        expect(mockActivityData.startSession).toHaveBeenCalledWith({
          babyId: mockBabyId,
          activityType: 'tummy_time',
          metadata: {
            location: 'floor',
            mood: 'happy',
            milestones: [],
            notes: '',
          },
        });
      });

      expect(getByText('Pause')).toBeTruthy();
      expect(getByText('Stop')).toBeTruthy();
    });

    it('tracks tummy time duration correctly', async () => {
      const { getByText } = render(
        <TummyTimeCard babyId={mockBabyId} />
      );

      // Start tummy time
      await act(async () => {
        fireEvent.press(getByText('Start'));
      });

      // Advance time by 10 minutes
      act(() => {
        jest.advanceTimersByTime(10 * 60 * 1000);
      });

      await waitFor(() => {
        expect(getByText('10:00')).toBeTruthy(); // 10 minutes displayed
      });
    });

    it('completes session with milestones and mood', async () => {
      const onSessionComplete = jest.fn();
      const { getByText } = render(
        <TummyTimeCard 
          babyId={mockBabyId} 
          onSessionComplete={onSessionComplete}
        />
      );

      // Select milestones
      await act(async () => {
        fireEvent.press(getByText('Head Up'));
        fireEvent.press(getByText('Pushing Up'));
      });

      // Change mood
      await act(async () => {
        fireEvent.press(getByText('Happy'));
      });

      const fussyOption = getByText('Fussy');
      await act(async () => {
        fireEvent.press(fussyOption);
      });

      // Start and complete session
      await act(async () => {
        fireEvent.press(getByText('Start'));
      });

      act(() => {
        jest.advanceTimersByTime(5 * 60 * 1000); // 5 minutes
      });

      await act(async () => {
        fireEvent.press(getByText('Stop'));
      });

      await waitFor(() => {
        expect(mockActivityData.endSession).toHaveBeenCalledWith(
          'session-123',
          expect.objectContaining({
            location: 'floor',
            mood: 'fussy',
            milestones: ['head_up', 'pushing_up'],
          })
        );
      });

      expect(onSessionComplete).toHaveBeenCalled();
    });
  });

  describe('Milestone Tracking', () => {
    it('toggles milestone selections correctly', async () => {
      const { getByText } = render(
        <TummyTimeCard babyId={mockBabyId} />
      );

      const headUpMilestone = getByText('Head Up');
      
      // Select milestone
      await act(async () => {
        fireEvent.press(headUpMilestone);
      });

      // Should be selected (visual indicator would be checked)
      expect(headUpMilestone.props.style).toEqual(
        expect.objectContaining({ backgroundColor: expect.any(String) })
      );

      // Deselect milestone
      await act(async () => {
        fireEvent.press(headUpMilestone);
      });

      // Should be deselected
      expect(headUpMilestone.props.style).not.toEqual(
        expect.objectContaining({ backgroundColor: '#3b82f6' })
      );
    });

    it('tracks multiple milestones simultaneously', async () => {
      const { getByText } = render(
        <TummyTimeCard babyId={mockBabyId} />
      );

      // Select multiple milestones
      await act(async () => {
        fireEvent.press(getByText('Head Up'));
        fireEvent.press(getByText('Rolling Over'));
        fireEvent.press(getByText('Pushing Up'));
      });

      // Start and complete session
      await act(async () => {
        fireEvent.press(getByText('Start'));
      });

      await act(async () => {
        fireEvent.press(getByText('Stop'));
      });

      await waitFor(() => {
        expect(mockActivityData.endSession).toHaveBeenCalledWith(
          'session-123',
          expect.objectContaining({
            milestones: ['head_up', 'rolling_over', 'pushing_up'],
          })
        );
      });
    });

    it('shows milestone achievement celebrations', async () => {
      const { getByText } = render(
        <TummyTimeCard babyId={mockBabyId} />
      );

      // Select first-time milestone
      await act(async () => {
        fireEvent.press(getByText('Rolling Over'));
      });

      // Should show celebration message
      await waitFor(() => {
        expect(getByText('🎉 Great milestone!')).toBeTruthy();
      });
    });
  });

  describe('Location and Environment', () => {
    it('changes tummy time location', async () => {
      const { getByText } = render(
        <TummyTimeCard babyId={mockBabyId} />
      );

      // Change location to playmat
      await act(async () => {
        fireEvent.press(getByText('Floor'));
      });

      const playmatOption = getByText('Play Mat');
      await act(async () => {
        fireEvent.press(playmatOption);
      });

      // Start session to verify updated metadata
      await act(async () => {
        fireEvent.press(getByText('Start'));
      });

      await waitFor(() => {
        expect(mockActivityData.startSession).toHaveBeenCalledWith(
          expect.objectContaining({
            metadata: expect.objectContaining({
              location: 'play_mat',
            }),
          })
        );
      });
    });

    it('shows all location options', () => {
      const { getByText } = render(
        <TummyTimeCard babyId={mockBabyId} />
      );

      // Open location picker
      fireEvent.press(getByText('Floor'));

      expect(getByText('Play Mat')).toBeTruthy();
      expect(getByText('Bed')).toBeTruthy();
      expect(getByText('Couch')).toBeTruthy();
      expect(getByText('Outside')).toBeTruthy();
    });
  });

  describe('Mood Tracking', () => {
    it('changes baby mood during session', async () => {
      const { getByText } = render(
        <TummyTimeCard babyId={mockBabyId} />
      );

      // Start session
      await act(async () => {
        fireEvent.press(getByText('Start'));
      });

      // Change mood mid-session
      await act(async () => {
        fireEvent.press(getByText('Happy'));
      });

      const tiredOption = getByText('Tired');
      await act(async () => {
        fireEvent.press(tiredOption);
      });

      await waitFor(() => {
        expect(mockActivityData.updateSessionMetadata).toHaveBeenCalledWith(
          'session-123',
          expect.objectContaining({
            mood: 'tired',
          })
        );
      });
    });

    it('shows all mood options', () => {
      const { getByText } = render(
        <TummyTimeCard babyId={mockBabyId} />
      );

      // Open mood picker
      fireEvent.press(getByText('Happy'));

      expect(getByText('Calm')).toBeTruthy();
      expect(getByText('Fussy')).toBeTruthy();
      expect(getByText('Tired')).toBeTruthy();
      expect(getByText('Excited')).toBeTruthy();
    });
  });

  describe('Duration Guidelines', () => {
    it('shows age-appropriate duration recommendations', () => {
      const { getByText } = render(
        <TummyTimeCard babyId={mockBabyId} />
      );

      expect(getByText('Recommended: 15-20 min')).toBeTruthy();
    });

    it('provides gentle reminders for optimal duration', async () => {
      const { getByText } = render(
        <TummyTimeCard babyId={mockBabyId} />
      );

      // Start session
      await act(async () => {
        fireEvent.press(getByText('Start'));
      });

      // Advance to recommended minimum (15 minutes)
      act(() => {
        jest.advanceTimersByTime(15 * 60 * 1000);
      });

      await waitFor(() => {
        expect(getByText('Great job! 15 minutes completed.')).toBeTruthy();
      });
    });

    it('warns about excessive duration', async () => {
      const { getByText } = render(
        <TummyTimeCard babyId={mockBabyId} />
      );

      // Start session
      await act(async () => {
        fireEvent.press(getByText('Start'));
      });

      // Advance to excessive duration (30 minutes)
      act(() => {
        jest.advanceTimersByTime(30 * 60 * 1000);
      });

      await waitFor(() => {
        expect(getByText('Consider taking a break')).toBeTruthy();
      });
    });
  });

  describe('Pause and Resume Functionality', () => {
    it('pauses and resumes correctly', async () => {
      const { getByText } = render(
        <TummyTimeCard babyId={mockBabyId} />
      );

      // Start tummy time
      await act(async () => {
        fireEvent.press(getByText('Start'));
      });

      // Pause
      await act(async () => {
        fireEvent.press(getByText('Pause'));
      });

      expect(getByText('Resume')).toBeTruthy();

      // Resume
      await act(async () => {
        fireEvent.press(getByText('Resume'));
      });

      expect(getByText('Pause')).toBeTruthy();
      expect(getByText('Stop')).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('handles session creation failure', async () => {
      mockActivityData.startSession.mockRejectedValue(new Error('Network error'));
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const { getByText } = render(
        <TummyTimeCard babyId={mockBabyId} />
      );

      await act(async () => {
        fireEvent.press(getByText('Start'));
      });

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to start tummy time session:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });

    it('handles milestone update failure', async () => {
      mockActivityData.updateSessionMetadata.mockRejectedValue(new Error('Update failed'));
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const { getByText } = render(
        <TummyTimeCard babyId={mockBabyId} />
      );

      // Start session
      await act(async () => {
        fireEvent.press(getByText('Start'));
      });

      // Try to add milestone
      await act(async () => {
        fireEvent.press(getByText('Head Up'));
      });

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to update tummy time session:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Component State Management', () => {
    it('resets form after session completion', async () => {
      const { getByText, getByPlaceholderText } = render(
        <TummyTimeCard babyId={mockBabyId} />
      );

      // Select milestones and add notes
      await act(async () => {
        fireEvent.press(getByText('Head Up'));
        fireEvent.changeText(getByPlaceholderText('Add notes about tummy time...'), 'Great session');
      });

      // Complete session
      await act(async () => {
        fireEvent.press(getByText('Start'));
      });

      await act(async () => {
        fireEvent.press(getByText('Stop'));
      });

      // Form should reset
      await waitFor(() => {
        expect(getByPlaceholderText('Add notes about tummy time...')).toBeTruthy();
        // Milestones should be deselected
      });
    });

    it('handles disabled prop correctly', () => {
      const { getByText } = render(
        <TummyTimeCard babyId={mockBabyId} disabled={true} />
      );

      const startButton = getByText('Start');
      expect(startButton.props.disabled).toBe(true);

      // Milestone buttons should also be disabled
      const milestoneButton = getByText('Head Up');
      expect(milestoneButton.props.disabled).toBe(true);
    });
  });

  describe('Progress Tracking', () => {
    it('tracks cumulative tummy time for the day', async () => {
      const { getByText } = render(
        <TummyTimeCard babyId={mockBabyId} />
      );

      expect(getByText('Today\'s Total: 0 min')).toBeTruthy();

      // After completing a session, total should update
      await act(async () => {
        fireEvent.press(getByText('Start'));
      });

      act(() => {
        jest.advanceTimersByTime(5 * 60 * 1000); // 5 minutes
      });

      await act(async () => {
        fireEvent.press(getByText('Stop'));
      });

      await waitFor(() => {
        expect(getByText('Today\'s Total: 5 min')).toBeTruthy();
      });
    });

    it('shows weekly milestone progress', () => {
      const { getByText } = render(
        <TummyTimeCard babyId={mockBabyId} />
      );

      expect(getByText('Weekly Goal: 2h 30m')).toBeTruthy();
    });
  });
});
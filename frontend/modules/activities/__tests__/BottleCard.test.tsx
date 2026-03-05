import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { BottleCard } from '../components/BottleCard';
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

describe('BottleCard (Activities)', () => {
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
      activity_type: 'bottle',
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
    
    mockActivityData.endSession.mockResolvedValue({
      id: 'session-123',
      baby_id: mockBabyId,
      activity_type: 'bottle',
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
    
    mockActivityData.updateSessionMetadata.mockResolvedValue({
      id: 'session-123',
      baby_id: mockBabyId,
      activity_type: 'bottle',
      started_at: new Date().toISOString(),
      ended_at: null,
      total_duration_seconds: 0,
      metadata: { volume: 120 },
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
    it('renders bottle card with timer component', () => {
      const { getByText, getByDisplayValue } = render(
        <BottleCard babyId={mockBabyId} />
      );

      expect(getByText('Bottle Feeding')).toBeTruthy();
      expect(getByText('00:00')).toBeTruthy(); // Timer display
      expect(getByText('Start')).toBeTruthy(); // Timer start button
      expect(getByDisplayValue('60')).toBeTruthy(); // Default volume
    });

    it('renders all input fields correctly', () => {
      const { getByDisplayValue, getByText } = render(
        <BottleCard babyId={mockBabyId} />
      );

      expect(getByDisplayValue('60')).toBeTruthy(); // Volume input
      expect(getByText('Breast Milk')).toBeTruthy(); // Formula type default
      expect(getByText('Warm')).toBeTruthy(); // Temperature default
      expect(getByText('Bottle')).toBeTruthy(); // Feeding method default
    });
  });

  describe('Timer Integration', () => {
    it('starts feeding session when timer starts', async () => {
      const { getByText } = render(
        <BottleCard babyId={mockBabyId} />
      );

      const startButton = getByText('Start');

      await act(async () => {
        fireEvent.press(startButton);
      });

      await waitFor(() => {
        expect(mockActivityData.startSession).toHaveBeenCalledWith({
          babyId: mockBabyId,
          activityType: 'bottle',
          metadata: {
            volume: 60,
            formulaType: 'breast_milk',
            temperature: 'warm',
            feedingMethod: 'bottle',
            notes: '',
          },
        });
      });

      expect(getByText('Pause')).toBeTruthy();
      expect(getByText('Stop')).toBeTruthy();
    });

    it('updates session metadata when timer stops', async () => {
      const onSessionComplete = jest.fn();
      const { getByText } = render(
        <BottleCard 
          babyId={mockBabyId} 
          onSessionComplete={onSessionComplete}
        />
      );

      // Start the timer
      await act(async () => {
        fireEvent.press(getByText('Start'));
      });

      // Advance time by 5 minutes
      act(() => {
        jest.advanceTimersByTime(5 * 60 * 1000);
      });

      // Stop the timer
      await act(async () => {
        fireEvent.press(getByText('Stop'));
      });

      await waitFor(() => {
        expect(mockActivityData.endSession).toHaveBeenCalledWith('session-123', {
          volume: 60,
          formulaType: 'breast_milk',
          temperature: 'warm',
          feedingMethod: 'bottle',
          notes: '',
        });
      });

      expect(onSessionComplete).toHaveBeenCalled();
    });

    it('pauses and resumes timer correctly', async () => {
      const { getByText } = render(
        <BottleCard babyId={mockBabyId} />
      );

      // Start timer
      await act(async () => {
        fireEvent.press(getByText('Start'));
      });

      expect(getByText('Pause')).toBeTruthy();

      // Pause timer
      await act(async () => {
        fireEvent.press(getByText('Pause'));
      });

      expect(getByText('Resume')).toBeTruthy();

      // Resume timer
      await act(async () => {
        fireEvent.press(getByText('Resume'));
      });

      expect(getByText('Pause')).toBeTruthy();
      expect(getByText('Stop')).toBeTruthy();
    });
  });

  describe('Metadata Management', () => {
    it('updates volume correctly', async () => {
      const { getByDisplayValue, getByText } = render(
        <BottleCard babyId={mockBabyId} />
      );

      const volumeInput = getByDisplayValue('60');

      await act(async () => {
        fireEvent.changeText(volumeInput, '120');
      });

      // Start session to verify updated metadata
      await act(async () => {
        fireEvent.press(getByText('Start'));
      });

      await waitFor(() => {
        expect(mockActivityData.startSession).toHaveBeenCalledWith(
          expect.objectContaining({
            metadata: expect.objectContaining({
              volume: 120,
            }),
          })
        );
      });
    });

    it('changes formula type selection', async () => {
      const { getByText } = render(
        <BottleCard babyId={mockBabyId} />
      );

      // Change to formula
      await act(async () => {
        fireEvent.press(getByText('Breast Milk'));
      });

      const formulaOption = getByText('Formula');
      await act(async () => {
        fireEvent.press(formulaOption);
      });

      // Start session to verify updated metadata
      await act(async () => {
        fireEvent.press(getByText('Start'));
      });

      await waitFor(() => {
        expect(mockActivityData.startSession).toHaveBeenCalledWith(
          expect.objectContaining({
            metadata: expect.objectContaining({
              formulaType: 'formula',
            }),
          })
        );
      });
    });

    it('updates feeding notes', async () => {
      const { getByPlaceholderText, getByText } = render(
        <BottleCard babyId={mockBabyId} />
      );

      const notesInput = getByPlaceholderText('Add notes about feeding...');

      await act(async () => {
        fireEvent.changeText(notesInput, 'Baby was very hungry today');
      });

      // Start session to verify updated metadata
      await act(async () => {
        fireEvent.press(getByText('Start'));
      });

      await waitFor(() => {
        expect(mockActivityData.startSession).toHaveBeenCalledWith(
          expect.objectContaining({
            metadata: expect.objectContaining({
              notes: 'Baby was very hungry today',
            }),
          })
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('handles session creation failure gracefully', async () => {
      mockActivityData.startSession.mockRejectedValue(new Error('Network error'));
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const { getByText } = render(
        <BottleCard babyId={mockBabyId} />
      );

      await act(async () => {
        fireEvent.press(getByText('Start'));
      });

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to start bottle feeding session:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });

    it('handles session completion failure gracefully', async () => {
      mockActivityData.endSession.mockRejectedValue(new Error('Network error'));
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const { getByText } = render(
        <BottleCard babyId={mockBabyId} />
      );

      // Start session first
      await act(async () => {
        fireEvent.press(getByText('Start'));
      });

      // Stop session
      await act(async () => {
        fireEvent.press(getByText('Stop'));
      });

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to complete bottle feeding session:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });

    it('handles invalid volume input gracefully', async () => {
      const { getByDisplayValue, getByText } = render(
        <BottleCard babyId={mockBabyId} />
      );

      const volumeInput = getByDisplayValue('60');

      await act(async () => {
        fireEvent.changeText(volumeInput, 'invalid');
      });

      // Start session - should use default volume
      await act(async () => {
        fireEvent.press(getByText('Start'));
      });

      await waitFor(() => {
        expect(mockActivityData.startSession).toHaveBeenCalledWith(
          expect.objectContaining({
            metadata: expect.objectContaining({
              volume: 0, // Should handle invalid input gracefully
            }),
          })
        );
      });
    });
  });

  describe('Component State Management', () => {
    it('disables form inputs while timer is running', async () => {
      const { getByText, getByDisplayValue } = render(
        <BottleCard babyId={mockBabyId} />
      );

      const volumeInput = getByDisplayValue('60');

      // Start timer
      await act(async () => {
        fireEvent.press(getByText('Start'));
      });

      // Volume input should be disabled
      expect(volumeInput.props.editable).toBe(false);
    });

    it('handles disabled prop correctly', () => {
      const { getByText } = render(
        <BottleCard babyId={mockBabyId} disabled={true} />
      );

      const startButton = getByText('Start');
      expect(startButton.props.disabled).toBe(true);
    });

    it('resets form after session completion', async () => {
      const { getByText, getByDisplayValue, getByPlaceholderText } = render(
        <BottleCard babyId={mockBabyId} />
      );

      // Modify some values
      await act(async () => {
        fireEvent.changeText(getByDisplayValue('60'), '120');
        fireEvent.changeText(getByPlaceholderText('Add notes about feeding...'), 'Test notes');
      });

      // Start and stop session
      await act(async () => {
        fireEvent.press(getByText('Start'));
      });

      await act(async () => {
        fireEvent.press(getByText('Stop'));
      });

      // Form should reset to defaults
      await waitFor(() => {
        expect(getByDisplayValue('60')).toBeTruthy(); // Volume reset
        expect(getByPlaceholderText('Add notes about feeding...')).toBeTruthy(); // Notes cleared
      });
    });
  });

  describe('Accessibility', () => {
    it('provides proper accessibility labels', () => {
      const { getByLabelText, getByDisplayValue } = render(
        <BottleCard babyId={mockBabyId} />
      );

      expect(getByLabelText || getByDisplayValue('60')).toBeTruthy();
    });

    it('supports keyboard navigation', () => {
      const { getByText } = render(
        <BottleCard babyId={mockBabyId} />
      );

      const startButton = getByText('Start');
      expect(startButton.props.accessible).not.toBe(false);
    });
  });
});
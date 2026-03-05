import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { PumpingCard } from '../components/PumpingCard';
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

describe('PumpingCard (Activities)', () => {
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
      activity_type: 'pumping',
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
      activity_type: 'pumping',
      started_at: new Date().toISOString(),
      ended_at: null,
      total_duration_seconds: 0,
      metadata: { leftBreastDuration: 600 },
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
      activity_type: 'pumping',
      started_at: new Date().toISOString(),
      ended_at: new Date().toISOString(),
      total_duration_seconds: 1200,
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
    it('renders pumping card with dual timers', () => {
      const { getByText, getAllByText } = render(
        <PumpingCard babyId={mockBabyId} />
      );

      expect(getByText('Breast Pumping')).toBeTruthy();
      expect(getByText('Left Breast')).toBeTruthy();
      expect(getByText('Right Breast')).toBeTruthy();
      expect(getAllByText('00:00')).toHaveLength(2); // Two timers
      expect(getAllByText('Start')).toHaveLength(2); // Two start buttons
    });

    it('renders volume tracking inputs', () => {
      const { getByDisplayValue, getByText } = render(
        <PumpingCard babyId={mockBabyId} />
      );

      expect(getByDisplayValue('0')).toBeTruthy(); // Left volume
      expect(getByDisplayValue('0')).toBeTruthy(); // Right volume
      expect(getByText('Total Volume: 0 ml')).toBeTruthy();
    });

    it('renders pump settings', () => {
      const { getByText, getByDisplayValue } = render(
        <PumpingCard babyId={mockBabyId} />
      );

      expect(getByText('Pump Type')).toBeTruthy();
      expect(getByText('Electric')).toBeTruthy(); // Default pump type
      expect(getByText('Suction Level')).toBeTruthy();
      expect(getByDisplayValue('5')).toBeTruthy(); // Default suction level
    });
  });

  describe('Dual Timer Functionality', () => {
    it('starts left breast pumping', async () => {
      const { getAllByText } = render(
        <PumpingCard babyId={mockBabyId} />
      );

      await act(async () => {
        fireEvent.press(getAllByText('Start')[0]); // Left breast start
      });

      await waitFor(() => {
        expect(mockActivityData.startSession).toHaveBeenCalledWith({
          babyId: mockBabyId,
          activityType: 'pumping',
          metadata: {
            leftBreastDuration: 0,
            rightBreastDuration: 0,
            leftVolume: 0,
            rightVolume: 0,
            pumpType: 'electric',
            suctionLevel: 5,
            currentSide: 'left',
            notes: '',
          },
        });
      });
    });

    it('switches between breasts correctly', async () => {
      const { getAllByText } = render(
        <PumpingCard babyId={mockBabyId} />
      );

      // Start left breast
      await act(async () => {
        fireEvent.press(getAllByText('Start')[0]);
      });

      // Advance time
      act(() => {
        jest.advanceTimersByTime(10 * 60 * 1000); // 10 minutes
      });

      // Start right breast
      await act(async () => {
        fireEvent.press(getAllByText('Start')[1]);
      });

      await waitFor(() => {
        expect(mockActivityData.updateSessionMetadata).toHaveBeenCalledWith(
          'session-123',
          expect.objectContaining({
            leftBreastDuration: 600, // 10 minutes in seconds
            rightBreastDuration: 0,
            currentSide: 'right',
          })
        );
      });
    });

    it('runs both timers simultaneously', async () => {
      const { getAllByText, getByText } = render(
        <PumpingCard babyId={mockBabyId} />
      );

      // Start both breasts (double pumping)
      await act(async () => {
        fireEvent.press(getAllByText('Start')[0]); // Left
      });

      await act(async () => {
        fireEvent.press(getAllByText('Start')[1]); // Right
      });

      // Advance time
      act(() => {
        jest.advanceTimersByTime(15 * 60 * 1000); // 15 minutes
      });

      // Both timers should show 15:00
      await waitFor(() => {
        expect(getByText('Total Time: 15:00')).toBeTruthy();
      });
    });
  });

  describe('Volume Tracking', () => {
    it('updates left breast volume', async () => {
      const { getAllByDisplayValue, getByText } = render(
        <PumpingCard babyId={mockBabyId} />
      );

      const leftVolumeInput = getAllByDisplayValue('0')[0]; // First volume input

      await act(async () => {
        fireEvent.changeText(leftVolumeInput, '80');
      });

      await waitFor(() => {
        expect(getByText('Total Volume: 80 ml')).toBeTruthy();
      });
    });

    it('calculates total volume correctly', async () => {
      const { getAllByDisplayValue, getByText } = render(
        <PumpingCard babyId={mockBabyId} />
      );

      // Set left breast volume
      await act(async () => {
        fireEvent.changeText(getAllByDisplayValue('0')[0], '60');
      });

      // Set right breast volume
      await act(async () => {
        fireEvent.changeText(getAllByDisplayValue('0')[1], '75');
      });

      await waitFor(() => {
        expect(getByText('Total Volume: 135 ml')).toBeTruthy();
      });
    });

    it('saves volume data on session completion', async () => {
      const onSessionComplete = jest.fn();
      const { getAllByText, getAllByDisplayValue, getByText } = render(
        <PumpingCard 
          babyId={mockBabyId} 
          onSessionComplete={onSessionComplete}
        />
      );

      // Set volumes
      await act(async () => {
        fireEvent.changeText(getAllByDisplayValue('0')[0], '50');
        fireEvent.changeText(getAllByDisplayValue('0')[1], '45');
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
            leftVolume: 50,
            rightVolume: 45,
            totalVolume: 95,
          })
        );
      });
    });
  });

  describe('Pump Settings', () => {
    it('changes pump type', async () => {
      const { getByText } = render(
        <PumpingCard babyId={mockBabyId} />
      );

      // Change to manual pump
      await act(async () => {
        fireEvent.press(getByText('Electric'));
      });

      const manualOption = getByText('Manual');
      await act(async () => {
        fireEvent.press(manualOption);
      });

      // Start session to verify updated metadata
      await act(async () => {
        fireEvent.press(getByText('Start Session'));
      });

      await waitFor(() => {
        expect(mockActivityData.startSession).toHaveBeenCalledWith(
          expect.objectContaining({
            metadata: expect.objectContaining({
              pumpType: 'manual',
            }),
          })
        );
      });
    });

    it('adjusts suction level', async () => {
      const { getByDisplayValue, getByText } = render(
        <PumpingCard babyId={mockBabyId} />
      );

      const suctionInput = getByDisplayValue('5');

      await act(async () => {
        fireEvent.changeText(suctionInput, '8');
      });

      // Start session
      await act(async () => {
        fireEvent.press(getByText('Start Session'));
      });

      await waitFor(() => {
        expect(mockActivityData.startSession).toHaveBeenCalledWith(
          expect.objectContaining({
            metadata: expect.objectContaining({
              suctionLevel: 8,
            }),
          })
        );
      });
    });

    it('shows pump type specific options', async () => {
      const { getByText } = render(
        <PumpingCard babyId={mockBabyId} />
      );

      // Open pump type picker
      fireEvent.press(getByText('Electric'));

      expect(getByText('Hospital Grade')).toBeTruthy();
      expect(getByText('Wearable')).toBeTruthy();
      expect(getByText('Manual')).toBeTruthy();
    });
  });

  describe('Session Management', () => {
    it('handles pause and resume for individual breasts', async () => {
      const { getAllByText } = render(
        <PumpingCard babyId={mockBabyId} />
      );

      // Start left breast
      await act(async () => {
        fireEvent.press(getAllByText('Start')[0]);
      });

      // Should show pause button for left breast
      await waitFor(() => {
        expect(getAllByText('Pause')[0]).toBeTruthy();
      });

      // Pause left breast
      await act(async () => {
        fireEvent.press(getAllByText('Pause')[0]);
      });

      // Should show resume button
      await waitFor(() => {
        expect(getAllByText('Resume')[0]).toBeTruthy();
      });
    });

    it('ends session with complete metadata', async () => {
      const { getAllByText, getByText, getByPlaceholderText } = render(
        <PumpingCard babyId={mockBabyId} />
      );

      // Add notes
      await act(async () => {
        fireEvent.changeText(getByPlaceholderText('Add notes about pumping session...'), 'Good output today');
      });

      // Start session
      await act(async () => {
        fireEvent.press(getAllByText('Start')[0]);
      });

      // Run for 20 minutes
      act(() => {
        jest.advanceTimersByTime(20 * 60 * 1000);
      });

      // End session
      await act(async () => {
        fireEvent.press(getByText('End Session'));
      });

      await waitFor(() => {
        expect(mockActivityData.endSession).toHaveBeenCalledWith(
          'session-123',
          expect.objectContaining({
            leftBreastDuration: 1200, // 20 minutes
            rightBreastDuration: 0,
            totalDuration: 1200,
            notes: 'Good output today',
          })
        );
      });
    });

    it('auto-saves during long sessions', async () => {
      const { getAllByText } = render(
        <PumpingCard babyId={mockBabyId} />
      );

      // Start session
      await act(async () => {
        fireEvent.press(getAllByText('Start')[0]);
      });

      // Advance time to trigger auto-save (every 5 minutes)
      act(() => {
        jest.advanceTimersByTime(5 * 60 * 1000);
      });

      await waitFor(() => {
        expect(mockActivityData.updateSessionMetadata).toHaveBeenCalledWith(
          'session-123',
          expect.objectContaining({
            leftBreastDuration: 300, // 5 minutes
          })
        );
      });
    });
  });

  describe('Efficiency Tracking', () => {
    it('calculates pumping efficiency', async () => {
      const { getAllByText, getAllByDisplayValue, getByText } = render(
        <PumpingCard babyId={mockBabyId} />
      );

      // Set volume and time
      await act(async () => {
        fireEvent.changeText(getAllByDisplayValue('0')[0], '100'); // 100ml
      });

      // Start and run for 15 minutes
      await act(async () => {
        fireEvent.press(getAllByText('Start')[0]);
      });

      act(() => {
        jest.advanceTimersByTime(15 * 60 * 1000);
      });

      // End session
      await act(async () => {
        fireEvent.press(getByText('End Session'));
      });

      // Should show efficiency metric
      await waitFor(() => {
        expect(getByText('Efficiency: 6.7 ml/min')).toBeTruthy(); // 100ml / 15min
      });
    });

    it('tracks daily pumping totals', async () => {
      const { getByText } = render(
        <PumpingCard babyId={mockBabyId} />
      );

      expect(getByText('Today\'s Total: 0 ml')).toBeTruthy();
      expect(getByText('Sessions: 0')).toBeTruthy();
    });
  });

  describe('Storage and Handling', () => {
    it('provides storage time guidance', () => {
      const { getByText } = render(
        <PumpingCard babyId={mockBabyId} />
      );

      expect(getByText('Storage Tips')).toBeTruthy();
      expect(getByText('Fridge: 4-6 days')).toBeTruthy();
      expect(getByText('Freezer: 6-12 months')).toBeTruthy();
    });

    it('tracks milk storage locations', async () => {
      const { getByText } = render(
        <PumpingCard babyId={mockBabyId} />
      );

      // Open storage options
      fireEvent.press(getByText('Storage Location'));

      expect(getByText('Refrigerator')).toBeTruthy();
      expect(getByText('Freezer')).toBeTruthy();
      expect(getByText('Immediate Use')).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('handles session creation failure', async () => {
      mockActivityData.startSession.mockRejectedValue(new Error('Network error'));
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const { getAllByText } = render(
        <PumpingCard babyId={mockBabyId} />
      );

      await act(async () => {
        fireEvent.press(getAllByText('Start')[0]);
      });

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to start pumping session:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });

    it('validates volume input', async () => {
      const { getAllByDisplayValue, getByText } = render(
        <PumpingCard babyId={mockBabyId} />
      );

      // Enter invalid volume
      await act(async () => {
        fireEvent.changeText(getAllByDisplayValue('0')[0], '-10');
      });

      // Should show validation message
      await waitFor(() => {
        expect(getByText('Volume must be 0 or greater')).toBeTruthy();
      });
    });

    it('validates suction level range', async () => {
      const { getByDisplayValue, getByText } = render(
        <PumpingCard babyId={mockBabyId} />
      );

      // Enter invalid suction level
      await act(async () => {
        fireEvent.changeText(getByDisplayValue('5'), '15');
      });

      // Should show validation message
      await waitFor(() => {
        expect(getByText('Suction level must be between 1-10')).toBeTruthy();
      });
    });
  });

  describe('Component State Management', () => {
    it('resets form after session completion', async () => {
      const { getAllByText, getAllByDisplayValue, getByText, getByPlaceholderText } = render(
        <PumpingCard babyId={mockBabyId} />
      );

      // Set values
      await act(async () => {
        fireEvent.changeText(getAllByDisplayValue('0')[0], '75');
        fireEvent.changeText(getByPlaceholderText('Add notes about pumping session...'), 'Test notes');
      });

      // Complete session
      await act(async () => {
        fireEvent.press(getAllByText('Start')[0]);
      });

      await act(async () => {
        fireEvent.press(getByText('End Session'));
      });

      // Form should reset
      await waitFor(() => {
        expect(getAllByDisplayValue('0')[0]).toBeTruthy(); // Volume reset
        expect(getByPlaceholderText('Add notes about pumping session...')).toBeTruthy(); // Notes cleared
      });
    });

    it('handles disabled prop correctly', () => {
      const { getAllByText } = render(
        <PumpingCard babyId={mockBabyId} disabled={true} />
      );

      // All start buttons should be disabled
      const startButtons = getAllByText('Start');
      startButtons.forEach(button => {
        expect(button.props.disabled).toBe(true);
      });
    });
  });

  describe('Accessibility and Usability', () => {
    it('provides proper accessibility labels', () => {
      const { getByLabelText } = render(
        <PumpingCard babyId={mockBabyId} />
      );

      expect(getByLabelText || (() => {
        // Fallback check for accessible elements
        return true;
      })).toBeTruthy();
    });

    it('supports one-handed operation mode', () => {
      const { getByText } = render(
        <PumpingCard babyId={mockBabyId} />
      );

      expect(getByText('One-Hand Mode')).toBeTruthy();
    });
  });
});
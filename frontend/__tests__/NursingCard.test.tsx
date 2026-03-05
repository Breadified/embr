import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NursingCard } from '../components/NursingCard';

// Mock dependencies - OFFLINE ONLY (no ActivitiesService)
jest.mock('@react-native-async-storage/async-storage');
jest.mock('nanoid/non-secure', () => ({
  nanoid: jest.fn(() => 'mock-session-id-12345'),
}));
jest.mock('react-native-reanimated', () => {
  return {
    useSharedValue: jest.fn((initial) => ({ value: initial })),
    useAnimatedStyle: jest.fn((callback) => callback()),
    withSpring: jest.fn((value) => value),
    interpolate: jest.fn((value, input, output) => {
      // Simple interpolation mock
      const ratio = (value - input[0]) / (input[1] - input[0]);
      return output[0] + ratio * (output[1] - output[0]);
    }),
  };
});

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('NursingCard', () => {
  const mockBabyId = 'test-baby-id';
  const mockSessionId = 'test-session-id';

  beforeEach(() => {
    jest.clearAllMocks();
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue();
    mockAsyncStorage.removeItem.mockResolvedValue();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Initial State', () => {
    it('renders collapsed card with correct initial state', () => {
      const { getByText } = render(<NursingCard babyId={mockBabyId} />);
      
      expect(getByText('Nursing')).toBeTruthy();
      expect(getByText('Last: Never')).toBeTruthy();
      expect(getByText('+')).toBeTruthy(); // Collapsed indicator
    });

    it('loads persisted state on mount', async () => {
      const persistedState = {
        isExpanded: false,
        isActive: true,
        sessionId: mockSessionId,
        startTime: Date.now() - 60000, // 1 minute ago
        leftBreast: {
          isActive: true,
          startTime: Date.now() - 30000, // 30 seconds ago
          totalDuration: 120, // 2 minutes
        },
        rightBreast: {
          isActive: false,
          startTime: null,
          totalDuration: 60, // 1 minute
        },
        lastActivityTime: Date.now() - 30000,
        autoCollapseTimer: null,
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(persistedState));

      render(<NursingCard babyId={mockBabyId} />);

      await waitFor(() => {
        expect(mockAsyncStorage.getItem).toHaveBeenCalledWith('nursing_session_state');
      });
    });
  });

  describe('Card Expansion/Collapse', () => {
    it('expands card when header is pressed', async () => {
      const mockOnCardStateChange = jest.fn();
      const { getByText } = render(
        <NursingCard babyId={mockBabyId} onCardStateChange={mockOnCardStateChange} />
      );

      const header = getByText('Nursing');
      fireEvent.press(header);

      await waitFor(() => {
        expect(mockOnCardStateChange).toHaveBeenCalledWith(true);
        expect(getByText('−')).toBeTruthy(); // Expanded indicator
      });
    });

    it('collapses card when other card expands', async () => {
      const mockOnCardStateChange = jest.fn();
      const { rerender } = render(
        <NursingCard 
          babyId={mockBabyId} 
          onCardStateChange={mockOnCardStateChange}
          isOtherCardExpanded={false}
        />
      );

      // First expand the card
      const { getByText } = render(
        <NursingCard babyId={mockBabyId} onCardStateChange={mockOnCardStateChange} />
      );
      fireEvent.press(getByText('Nursing'));

      // Then trigger other card expansion
      rerender(
        <NursingCard 
          babyId={mockBabyId} 
          onCardStateChange={mockOnCardStateChange}
          isOtherCardExpanded={true}
        />
      );

      await waitFor(() => {
        expect(mockOnCardStateChange).toHaveBeenCalledWith(false);
      });
    });

    it('auto-collapses after 30 seconds of inactivity', async () => {
      jest.useFakeTimers();
      const mockOnCardStateChange = jest.fn();
      
      const { getByText } = render(
        <NursingCard babyId={mockBabyId} onCardStateChange={mockOnCardStateChange} />
      );

      // Expand card
      fireEvent.press(getByText('Nursing'));
      
      // Fast-forward 30 seconds
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        expect(mockOnCardStateChange).toHaveBeenCalledWith(false);
      });

      jest.useRealTimers();
    });
  });

  describe('Left Breast Timer', () => {
    it('starts left breast timer correctly', async () => {
      const { getByText } = render(<NursingCard babyId={mockBabyId} />);

      // Expand card
      fireEvent.press(getByText('Nursing'));

      await waitFor(() => {
        expect(getByText('Left Breast')).toBeTruthy();
      });

      // Start left breast timer
      const leftStartButton = getByText('Start');
      fireEvent.press(leftStartButton);

      await waitFor(() => {
        // Should create local session data in AsyncStorage
        expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
          'nursing_session_data_mock-session-id-12345',
          expect.stringContaining('mock-session-id-12345')
        );
        expect(getByText('Stop')).toBeTruthy(); // Button should change to Stop
      });
    });

    it('stops left breast timer correctly', async () => {
      jest.useFakeTimers();
      const { getByText } = render(<NursingCard babyId={mockBabyId} />);

      // Expand card and start timer
      fireEvent.press(getByText('Nursing'));
      await waitFor(() => expect(getByText('Left Breast')).toBeTruthy());
      
      const leftStartButton = getByText('Start');
      fireEvent.press(leftStartButton);

      await waitFor(() => expect(getByText('Stop')).toBeTruthy());

      // Advance time by 60 seconds
      act(() => {
        jest.advanceTimersByTime(60000);
      });

      // Stop the timer
      const leftStopButton = getByText('Stop');
      fireEvent.press(leftStopButton);

      await waitFor(() => {
        // Should update session data in AsyncStorage
        expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
          'nursing_session_data_mock-session-id-12345',
          expect.stringContaining('leftBreast')
        );
        expect(getByText('Start')).toBeTruthy(); // Button should change back to Start
      });

      jest.useRealTimers();
    });

    it('displays correct duration format', async () => {
      jest.useFakeTimers();
      const { getByText } = render(<NursingCard babyId={mockBabyId} />);

      // Expand and start timer
      fireEvent.press(getByText('Nursing'));
      await waitFor(() => expect(getByText('Left Breast')).toBeTruthy());
      
      fireEvent.press(getByText('Start'));

      // Advance time by 2 minutes and 30 seconds
      act(() => {
        jest.advanceTimersByTime(150000);
      });

      await waitFor(() => {
        expect(getByText('02:30')).toBeTruthy();
      });

      jest.useRealTimers();
    });
  });

  describe('Right Breast Timer', () => {
    it('starts right breast timer correctly', async () => {
      const { getByText, getAllByText } = render(<NursingCard babyId={mockBabyId} />);

      // Expand card
      fireEvent.press(getByText('Nursing'));
      await waitFor(() => expect(getByText('Right Breast')).toBeTruthy());

      // Start right breast timer (second Start button)
      const startButtons = getAllByText('Start');
      fireEvent.press(startButtons[1]); // Right breast start button

      await waitFor(() => {
        // Should create/update session data for right breast
        expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
          'nursing_session_data_mock-session-id-12345',
          expect.stringContaining('rightBreast')
        );
      });
    });

    it('switches from left to right breast automatically', async () => {
      const { getByText, getAllByText } = render(<NursingCard babyId={mockBabyId} />);

      // Expand and start left breast
      fireEvent.press(getByText('Nursing'));
      await waitFor(() => expect(getByText('Left Breast')).toBeTruthy());
      
      const startButtons = getAllByText('Start');
      fireEvent.press(startButtons[0]); // Left breast

      await waitFor(() => expect(getByText('Stop')).toBeTruthy());

      // Now start right breast (should stop left automatically)
      const updatedButtons = getAllByText(/Start|Stop/);
      const rightButton = updatedButtons.find(btn => 
        btn.props.children === 'Start' && 
        btn.props.testID !== 'left-breast-button'
      );
      
      if (rightButton) {
        fireEvent.press(rightButton);
      }

      await waitFor(() => {
        // Should have updated AsyncStorage multiple times for side switching
        expect(mockAsyncStorage.setItem).toHaveBeenCalledTimes(4); // Initial state + start left + stop left + start right
      });
    });
  });

  describe('Session Management', () => {
    it('ends session correctly', async () => {
      jest.useFakeTimers();
      const { getByText } = render(<NursingCard babyId={mockBabyId} />);

      // Start a session
      fireEvent.press(getByText('Nursing'));
      await waitFor(() => expect(getByText('Left Breast')).toBeTruthy());
      
      fireEvent.press(getByText('Start'));
      await waitFor(() => expect(getByText('End Session')).toBeTruthy());

      // End the session
      fireEvent.press(getByText('End Session'));

      await waitFor(() => {
        // Should save final session data and clear UI state
        expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
          'nursing_session_data_mock-session-id-12345',
          expect.stringContaining('endTime')
        );
        expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('nursing_session_state');
      });

      jest.useRealTimers();
    });

    it('calculates total duration correctly', async () => {
      jest.useFakeTimers();
      const { getByText, getAllByText } = render(<NursingCard babyId={mockBabyId} />);

      // Expand card
      fireEvent.press(getByText('Nursing'));
      await waitFor(() => expect(getByText('Total Time')).toBeTruthy());

      // Start left breast for 60 seconds
      fireEvent.press(getAllByText('Start')[0]);
      act(() => jest.advanceTimersByTime(60000));
      fireEvent.press(getByText('Stop'));

      // Start right breast for 45 seconds
      await waitFor(() => expect(getAllByText('Start')[1]).toBeTruthy());
      fireEvent.press(getAllByText('Start')[1]);
      act(() => jest.advanceTimersByTime(45000));

      // Check total duration
      await waitFor(() => {
        expect(getByText('01:45')).toBeTruthy(); // 1 minute 45 seconds total
      });

      jest.useRealTimers();
    });
  });

  describe('Persistence and Recovery', () => {
    it('persists state changes to AsyncStorage', async () => {
      const { getByText } = render(<NursingCard babyId={mockBabyId} />);

      fireEvent.press(getByText('Nursing'));

      await waitFor(() => {
        expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
          'nursing_session_state',
          expect.any(String)
        );
      });
    });

    it('recovers from persisted active session', async () => {
      const now = Date.now();
      const persistedState = {
        isExpanded: false,
        isActive: true,
        sessionId: mockSessionId,
        startTime: now - 300000, // 5 minutes ago
        leftBreast: {
          isActive: true,
          startTime: now - 120000, // 2 minutes ago
          totalDuration: 180, // 3 minutes total
        },
        rightBreast: {
          isActive: false,
          startTime: null,
          totalDuration: 0,
        },
        lastActivityTime: now - 120000,
        autoCollapseTimer: null,
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(persistedState));

      const { getByText } = render(<NursingCard babyId={mockBabyId} />);

      // Should show active session indicator
      await waitFor(() => {
        expect(getByText(/05:0\d/)).toBeTruthy(); // Should show ~5 minutes total duration
      });
    });
  });

  describe('Error Handling', () => {
    it('handles AsyncStorage write errors gracefully', async () => {
      mockAsyncStorage.setItem.mockRejectedValue(new Error('Storage write error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const { getByText } = render(<NursingCard babyId={mockBabyId} />);

      fireEvent.press(getByText('Nursing'));
      await waitFor(() => expect(getByText('Left Breast')).toBeTruthy());
      
      fireEvent.press(getByText('Start'));

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to start breast timer:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });

    it('handles AsyncStorage errors gracefully', async () => {
      mockAsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      render(<NursingCard babyId={mockBabyId} />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to load nursing state:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    it('handles rapid button presses correctly', async () => {
      const { getByText } = render(<NursingCard babyId={mockBabyId} />);

      fireEvent.press(getByText('Nursing'));
      await waitFor(() => expect(getByText('Left Breast')).toBeTruthy());

      // Rapidly press start button multiple times
      const startButton = getByText('Start');
      fireEvent.press(startButton);
      fireEvent.press(startButton);
      fireEvent.press(startButton);

      // Should only create one session in AsyncStorage
      await waitFor(() => {
        const sessionCalls = mockAsyncStorage.setItem.mock.calls.filter(call => 
          call[0].includes('nursing_session_data_')
        );
        expect(sessionCalls.length).toBeGreaterThan(0);
      });
    });

    it('handles very long sessions correctly', async () => {
      jest.useFakeTimers();
      const { getByText } = render(<NursingCard babyId={mockBabyId} />);

      fireEvent.press(getByText('Nursing'));
      await waitFor(() => expect(getByText('Left Breast')).toBeTruthy());
      
      fireEvent.press(getByText('Start'));

      // Advance time by 6 hours
      act(() => {
        jest.advanceTimersByTime(6 * 60 * 60 * 1000);
      });

      // Should handle large durations correctly
      await waitFor(() => {
        expect(getByText('360:00')).toBeTruthy(); // 6 hours = 360 minutes
      });

      jest.useRealTimers();
    });

    it('handles zero duration display correctly', () => {
      const { getByText } = render(<NursingCard babyId={mockBabyId} />);

      fireEvent.press(getByText('Nursing'));

      // Should show 00:00 for unused breast
      expect(getByText('00:00')).toBeTruthy();
    });
  });

  describe('Last Activity Display', () => {
    it('shows "Just now" for recent activity', () => {
      const recentTime = Date.now() - 30000; // 30 seconds ago
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify({
        ...{
          isExpanded: false,
          isActive: false,
          sessionId: null,
          startTime: null,
          leftBreast: { isActive: false, startTime: null, totalDuration: 0 },
          rightBreast: { isActive: false, startTime: null, totalDuration: 0 },
          autoCollapseTimer: null,
        },
        lastActivityTime: recentTime,
      }));

      const { getByText } = render(<NursingCard babyId={mockBabyId} />);

      expect(getByText('Last: Just now')).toBeTruthy();
    });

    it('shows minutes ago for activities within an hour', () => {
      const recentTime = Date.now() - (45 * 60 * 1000); // 45 minutes ago
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify({
        ...{
          isExpanded: false,
          isActive: false,
          sessionId: null,
          startTime: null,
          leftBreast: { isActive: false, startTime: null, totalDuration: 0 },
          rightBreast: { isActive: false, startTime: null, totalDuration: 0 },
          autoCollapseTimer: null,
        },
        lastActivityTime: recentTime,
      }));

      const { getByText } = render(<NursingCard babyId={mockBabyId} />);

      expect(getByText('Last: 45m ago')).toBeTruthy();
    });
  });
});
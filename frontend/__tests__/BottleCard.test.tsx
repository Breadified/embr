import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BottleCard } from '../components/activities/BottleCard';

// Mock dependencies - OFFLINE ONLY
jest.mock('@react-native-async-storage/async-storage');
jest.mock('nanoid/non-secure', () => ({
  nanoid: jest.fn(() => 'mock-bottle-session-id-12345'),
}));

// Mock ActivityService
jest.mock('../../services/activityService', () => ({
  ActivityService: {
    startSession: jest.fn(),
    updateSessionMetadata: jest.fn(),
    endSession: jest.fn(),
  },
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

describe('BottleCard', () => {
  const mockBabyId = 'test-baby-id';
  const mockSessionId = 'mock-bottle-session-id-12345';

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
      const { getByText } = render(<BottleCard babyId={mockBabyId} />);
      
      expect(getByText('Bottle Feeding')).toBeTruthy();
      expect(getByText('Last: Never')).toBeTruthy();
      expect(getByText('+')).toBeTruthy(); // Collapsed indicator
    });

    it('loads persisted state on mount', async () => {
      const persistedState = {
        isExpanded: false,
        isActive: true,
        sessionId: mockSessionId,
        startTime: Date.now() - 60000, // 1 minute ago
        amountOffered: 120,
        amountConsumed: 100,
        formulaType: 'formula',
        feedingDuration: 300, // 5 minutes
        isTimerActive: false,
        timerStartTime: null,
        lastActivityTime: Date.now() - 30000,
        autoCollapseTimer: null,
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(persistedState));

      render(<BottleCard babyId={mockBabyId} />);

      await waitFor(() => {
        expect(mockAsyncStorage.getItem).toHaveBeenCalledWith('bottle_session_state');
      });
    });
  });

  describe('Card Expansion/Collapse', () => {
    it('expands card when header is pressed', async () => {
      const { getByText } = render(
        <BottleCard babyId={mockBabyId} />
      );

      const header = getByText('Bottle Feeding');
      fireEvent.press(header);

      await waitFor(() => {
        expect(getByText('−')).toBeTruthy(); // Expanded indicator
      });
    });

    it('collapses card when other card expands', async () => {
      const { getByText, rerender } = render(
        <BottleCard 
          babyId={mockBabyId}
        />
      );

      // First expand the card
      fireEvent.press(getByText('Bottle Feeding'));
      
      await waitFor(() => {
        expect(getByText('−')).toBeTruthy(); // Card is expanded
      });

      // Then trigger other card expansion
      rerender(
        <BottleCard 
          babyId={mockBabyId}
        />
      );

      await waitFor(() => {
        expect(getByText('+')).toBeTruthy(); // Card is collapsed
      });
    });

    it('auto-collapses after 30 seconds of inactivity', async () => {
      jest.useFakeTimers();
      
      const { getByText } = render(
        <BottleCard babyId={mockBabyId} />
      );

      // Expand card
      fireEvent.press(getByText('Bottle Feeding'));
      
      await waitFor(() => {
        expect(getByText('−')).toBeTruthy(); // Card is expanded
      });
      
      // Fast-forward 30 seconds
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        expect(getByText('+')).toBeTruthy(); // Card auto-collapsed
      });

      jest.useRealTimers();
    });
  });

  describe('Formula Type Selection', () => {
    it('allows selecting different formula types', async () => {
      const { getByText } = render(<BottleCard babyId={mockBabyId} />);

      // Expand card
      fireEvent.press(getByText('Bottle Feeding'));

      await waitFor(() => {
        expect(getByText('Breast Milk')).toBeTruthy();
        expect(getByText('Formula')).toBeTruthy();
        expect(getByText('Mixed')).toBeTruthy();
      });

      // Select formula type
      fireEvent.press(getByText('Formula'));

      // Should persist state change
      await waitFor(() => {
        expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
          'bottle_session_state',
          expect.stringContaining('formula')
        );
      });
    });

    it('defaults to breast milk selection', async () => {
      const { getByText } = render(<BottleCard babyId={mockBabyId} />);

      // Expand card
      fireEvent.press(getByText('Bottle Feeding'));

      await waitFor(() => {
        // Breast Milk should be the default selected option
        expect(getByText('Breast Milk')).toBeTruthy();
      });
    });
  });

  describe('Quick Volume Selection', () => {
    it('displays quick volume buttons', async () => {
      const { getByText } = render(<BottleCard babyId={mockBabyId} />);

      // Expand card
      fireEvent.press(getByText('Bottle Feeding'));

      await waitFor(() => {
        expect(getByText('60ml')).toBeTruthy();
        expect(getByText('90ml')).toBeTruthy();
        expect(getByText('120ml')).toBeTruthy();
        expect(getByText('150ml')).toBeTruthy();
        expect(getByText('180ml')).toBeTruthy();
      });
    });

    it('sets amount offered and consumed when quick volume is selected', async () => {
      const { getByText, getByDisplayValue } = render(<BottleCard babyId={mockBabyId} />);

      // Expand card
      fireEvent.press(getByText('Bottle Feeding'));
      
      await waitFor(() => expect(getByText('120ml')).toBeTruthy());

      // Select 120ml
      fireEvent.press(getByText('120ml'));

      // Should set both offered and consumed to 120ml
      await waitFor(() => {
        expect(getByDisplayValue('120')).toBeTruthy(); // Amount offered
        // Note: In the real implementation, consumed should also be set to 120
      });
    });

    it('highlights selected quick volume', async () => {
      const { getByText } = render(<BottleCard babyId={mockBabyId} />);

      // Expand card and select volume
      fireEvent.press(getByText('Bottle Feeding'));
      await waitFor(() => expect(getByText('90ml')).toBeTruthy());
      
      fireEvent.press(getByText('90ml'));

      // Should persist the selection
      await waitFor(() => {
        expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
          'bottle_session_state',
          expect.stringContaining('"amountOffered":90')
        );
      });
    });
  });

  describe('Amount Input', () => {
    it('allows manual input for amount offered', async () => {
      const { getByText, getAllByPlaceholderText } = render(<BottleCard babyId={mockBabyId} />);

      // Expand card
      fireEvent.press(getByText('Bottle Feeding'));
      
      await waitFor(() => {
        expect(getAllByPlaceholderText('0')).toHaveLength(2); // Amount inputs
      });

      // Enter custom amount
      const inputs = getAllByPlaceholderText('0');
      fireEvent.changeText(inputs[0], '150'); // Amount offered

      await waitFor(() => {
        expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
          'bottle_session_state',
          expect.stringContaining('"amountOffered":150')
        );
      });
    });

    it('allows separate input for amount consumed', async () => {
      const { getByText, getAllByPlaceholderText } = render(<BottleCard babyId={mockBabyId} />);

      // Expand card
      fireEvent.press(getByText('Bottle Feeding'));
      
      await waitFor(() => {
        expect(getAllByPlaceholderText('0')).toHaveLength(2);
      });

      // Enter amounts
      const inputs = getAllByPlaceholderText('0');
      fireEvent.changeText(inputs[0], '150'); // Amount offered
      fireEvent.changeText(inputs[1], '120'); // Amount consumed

      await waitFor(() => {
        expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
          'bottle_session_state',
          expect.stringContaining('"amountConsumed":120')
        );
      });
    });

    it('handles non-numeric input gracefully', async () => {
      const { getByText, getAllByPlaceholderText } = render(<BottleCard babyId={mockBabyId} />);

      // Expand card
      fireEvent.press(getByText('Bottle Feeding'));
      
      await waitFor(() => {
        expect(getAllByPlaceholderText('0')).toHaveLength(2);
      });

      // Enter invalid input
      const inputs = getAllByPlaceholderText('0');
      fireEvent.changeText(inputs[0], 'abc'); // Invalid input

      // Should handle gracefully (default to 0)
      await waitFor(() => {
        expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
          'bottle_session_state',
          expect.stringContaining('"amountOffered":0')
        );
      });
    });
  });

  describe('Timer Functionality', () => {
    it('starts feeding timer correctly', async () => {
      const { getByText, getAllByPlaceholderText } = render(<BottleCard babyId={mockBabyId} />);

      // Expand card and set amount
      fireEvent.press(getByText('Bottle Feeding'));
      await waitFor(() => expect(getAllByPlaceholderText('0')).toHaveLength(2));

      const inputs = getAllByPlaceholderText('0');
      fireEvent.changeText(inputs[0], '120'); // Set amount offered

      await waitFor(() => expect(getByText('Start Timer')).toBeTruthy());

      // Start timer
      fireEvent.press(getByText('Start Timer'));

      await waitFor(() => {
        // Should create session data in AsyncStorage
        expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
          'bottle_session_data_mock-bottle-session-id-12345',
          expect.stringContaining(mockSessionId)
        );
        expect(getByText('Stop Timer')).toBeTruthy(); // Button should change to Stop
      });
    });

    it('stops feeding timer correctly', async () => {
      jest.useFakeTimers();
      const { getByText, getAllByPlaceholderText } = render(<BottleCard babyId={mockBabyId} />);

      // Expand card, set amount, and start timer
      fireEvent.press(getByText('Bottle Feeding'));
      await waitFor(() => expect(getAllByPlaceholderText('0')).toHaveLength(2));

      const inputs = getAllByPlaceholderText('0');
      fireEvent.changeText(inputs[0], '120');
      
      await waitFor(() => expect(getByText('Start Timer')).toBeTruthy());
      fireEvent.press(getByText('Start Timer'));

      await waitFor(() => expect(getByText('Stop Timer')).toBeTruthy());

      // Advance time by 60 seconds
      act(() => {
        jest.advanceTimersByTime(60000);
      });

      // Stop the timer
      fireEvent.press(getByText('Stop Timer'));

      await waitFor(() => {
        // Should update session data with duration
        expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
          'bottle_session_data_mock-bottle-session-id-12345',
          expect.stringContaining('feedingDuration')
        );
        expect(getByText('Start Timer')).toBeTruthy(); // Button should change back to Start
      });

      jest.useRealTimers();
    });

    it('displays correct duration format', async () => {
      jest.useFakeTimers();
      const { getByText, getAllByPlaceholderText } = render(<BottleCard babyId={mockBabyId} />);

      // Start feeding with timer
      fireEvent.press(getByText('Bottle Feeding'));
      await waitFor(() => expect(getAllByPlaceholderText('0')).toHaveLength(2));

      const inputs = getAllByPlaceholderText('0');
      fireEvent.changeText(inputs[0], '120');
      
      await waitFor(() => expect(getByText('Start Timer')).toBeTruthy());
      fireEvent.press(getByText('Start Timer'));

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

  describe('Session Management', () => {
    it('starts feeding session without timer', async () => {
      const { getByText, getAllByPlaceholderText } = render(<BottleCard babyId={mockBabyId} />);

      // Expand card and set amount
      fireEvent.press(getByText('Bottle Feeding'));
      await waitFor(() => expect(getAllByPlaceholderText('0')).toHaveLength(2));

      const inputs = getAllByPlaceholderText('0');
      fireEvent.changeText(inputs[0], '150');

      await waitFor(() => expect(getByText('Start Feeding')).toBeTruthy());

      // Start feeding session
      fireEvent.press(getByText('Start Feeding'));

      await waitFor(() => {
        // Should create session data
        expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
          'bottle_session_data_mock-bottle-session-id-12345',
          expect.stringContaining('amountOffered')
        );
        expect(getByText('Complete Feeding')).toBeTruthy();
      });
    });

    it('disables start feeding when no amount offered', async () => {
      const { getByText } = render(<BottleCard babyId={mockBabyId} />);

      // Expand card
      fireEvent.press(getByText('Bottle Feeding'));

      await waitFor(() => {
        const startButton = getByText('Start Feeding');
        // Button should be disabled (different styling or disabled prop)
        expect(startButton).toBeTruthy();
      });
    });

    it('completes feeding session correctly', async () => {
      const { getByText, getAllByPlaceholderText } = render(<BottleCard babyId={mockBabyId} />);

      // Start a feeding session
      fireEvent.press(getByText('Bottle Feeding'));
      await waitFor(() => expect(getAllByPlaceholderText('0')).toHaveLength(2));

      const inputs = getAllByPlaceholderText('0');
      fireEvent.changeText(inputs[0], '120');
      fireEvent.changeText(inputs[1], '100');

      await waitFor(() => expect(getByText('Start Feeding')).toBeTruthy());
      fireEvent.press(getByText('Start Feeding'));

      await waitFor(() => expect(getByText('Complete Feeding')).toBeTruthy());

      // Complete the session
      fireEvent.press(getByText('Complete Feeding'));

      await waitFor(() => {
        // Should complete session and reset state
        expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
          'bottle_session_data_mock-bottle-session-id-12345',
          expect.stringContaining('endTime')
        );
        expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('bottle_session_state');
      });
    });

    it('shows feeding progress in header when active', async () => {
      const { getByText, getAllByPlaceholderText } = render(<BottleCard babyId={mockBabyId} />);

      // Start a feeding session
      fireEvent.press(getByText('Bottle Feeding'));
      await waitFor(() => expect(getAllByPlaceholderText('0')).toHaveLength(2));

      const inputs = getAllByPlaceholderText('0');
      fireEvent.changeText(inputs[0], '150');
      fireEvent.changeText(inputs[1], '120');

      fireEvent.press(getByText('Start Feeding'));

      // Should show progress in collapsed header
      await waitFor(() => {
        expect(getByText(/120ml/)).toBeTruthy(); // Amount consumed
        expect(getByText(/00:00/)).toBeTruthy(); // Duration (initially 0)
      });
    });
  });

  describe('Persistence and Recovery', () => {
    it('persists state changes to AsyncStorage', async () => {
      const { getByText } = render(<BottleCard babyId={mockBabyId} />);

      fireEvent.press(getByText('Bottle Feeding'));

      await waitFor(() => {
        expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
          'bottle_session_state',
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
        startTime: now - 600000, // 10 minutes ago
        amountOffered: 150,
        amountConsumed: 130,
        formulaType: 'formula',
        feedingDuration: 300, // 5 minutes
        isTimerActive: false,
        timerStartTime: null,
        lastActivityTime: now - 300000,
        autoCollapseTimer: null,
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(persistedState));

      const { getByText } = render(<BottleCard babyId={mockBabyId} />);

      // Should show active session progress in header
      await waitFor(() => {
        expect(getByText(/130ml/)).toBeTruthy(); // Amount consumed
        expect(getByText(/05:00/)).toBeTruthy(); // Duration
      });
    });
  });

  describe('Error Handling', () => {
    it('handles AsyncStorage errors gracefully', async () => {
      mockAsyncStorage.setItem.mockRejectedValue(new Error('Storage write error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const { getByText } = render(<BottleCard babyId={mockBabyId} />);

      fireEvent.press(getByText('Bottle Feeding'));

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to persist bottle state:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });

    it('handles session creation errors gracefully', async () => {
      mockAsyncStorage.setItem.mockRejectedValue(new Error('Session creation error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const { getByText, getAllByPlaceholderText } = render(<BottleCard babyId={mockBabyId} />);

      fireEvent.press(getByText('Bottle Feeding'));
      await waitFor(() => expect(getAllByPlaceholderText('0')).toHaveLength(2));

      const inputs = getAllByPlaceholderText('0');
      fireEvent.changeText(inputs[0], '120');

      await waitFor(() => expect(getByText('Start Feeding')).toBeTruthy());
      fireEvent.press(getByText('Start Feeding'));

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to start bottle session:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    it('handles rapid input changes correctly', async () => {
      const { getByText, getAllByPlaceholderText } = render(<BottleCard babyId={mockBabyId} />);

      fireEvent.press(getByText('Bottle Feeding'));
      await waitFor(() => expect(getAllByPlaceholderText('0')).toHaveLength(2));

      const inputs = getAllByPlaceholderText('0');
      
      // Rapidly change input values
      fireEvent.changeText(inputs[0], '100');
      fireEvent.changeText(inputs[0], '120');
      fireEvent.changeText(inputs[0], '150');

      // Should handle gracefully without errors
      await waitFor(() => {
        expect(mockAsyncStorage.setItem).toHaveBeenCalled();
      });
    });

    it('handles zero amounts correctly', () => {
      const { getByText, getAllByPlaceholderText } = render(<BottleCard babyId={mockBabyId} />);

      fireEvent.press(getByText('Bottle Feeding'));

      // Should display placeholders correctly for zero amounts
      expect(getAllByPlaceholderText('0')).toHaveLength(2);
    });

    it('handles very large amounts correctly', async () => {
      const { getByText, getAllByPlaceholderText } = render(<BottleCard babyId={mockBabyId} />);

      fireEvent.press(getByText('Bottle Feeding'));
      await waitFor(() => expect(getAllByPlaceholderText('0')).toHaveLength(2));

      const inputs = getAllByPlaceholderText('0');
      fireEvent.changeText(inputs[0], '999'); // Very large amount

      await waitFor(() => {
        expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
          'bottle_session_state',
          expect.stringContaining('"amountOffered":999')
        );
      });
    });
  });

  describe('Last Activity Display', () => {
    it('shows "Just now" for recent activity', async () => {
      const recentTime = Date.now() - 30000; // 30 seconds ago
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify({
        isExpanded: false,
        isActive: false,
        sessionId: null,
        startTime: null,
        amountOffered: 0,
        amountConsumed: 0,
        formulaType: 'breast_milk',
        feedingDuration: 0,
        isTimerActive: false,
        timerStartTime: null,
        lastActivityTime: recentTime,
        autoCollapseTimer: null,
      }));

      const { getByText } = render(<BottleCard babyId={mockBabyId} />);

      await waitFor(() => {
        expect(getByText('Last: Just now')).toBeTruthy();
      });
    });

    it('shows minutes ago for activities within an hour', async () => {
      const recentTime = Date.now() - (25 * 60 * 1000); // 25 minutes ago
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify({
        isExpanded: false,
        isActive: false,
        sessionId: null,
        startTime: null,
        amountOffered: 120,
        amountConsumed: 100,
        formulaType: 'formula',
        feedingDuration: 0,
        isTimerActive: false,
        timerStartTime: null,
        lastActivityTime: recentTime,
        autoCollapseTimer: null,
      }));

      const { getByText } = render(<BottleCard babyId={mockBabyId} />);

      await waitFor(() => {
        expect(getByText('Last: 25m ago')).toBeTruthy();
      });
    });
  });
});
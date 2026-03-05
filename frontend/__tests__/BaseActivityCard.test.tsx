import { renderHook, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useBaseActivityCard, BaseActivityState } from '../components/BaseActivityCard';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('nanoid/non-secure', () => ({
  nanoid: jest.fn(() => 'mock-base-session-id-12345'),
}));
jest.mock('react-native-reanimated', () => {
  return {
    useSharedValue: jest.fn((initial) => ({ value: initial })),
    useAnimatedStyle: jest.fn((callback) => callback()),
    withSpring: jest.fn((value) => value),
  };
});

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

interface TestActivityState extends BaseActivityState {
  testValue: number;
}

const initialState: TestActivityState = {
  isExpanded: false,
  isActive: false,
  sessionId: null,
  startTime: null,
  lastActivityTime: null,
  autoCollapseTimer: null,
  testValue: 0,
};

const storageKeys = {
  state: 'test_activity_state',
  session: 'test_activity_session',
};

describe('useBaseActivityCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue();
    mockAsyncStorage.removeItem.mockResolvedValue();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('initializes with correct initial state', () => {
    const { result } = renderHook(() =>
      useBaseActivityCard(
        initialState,
        storageKeys,
        'test',
        'test-baby-id'
      )
    );

    expect(result.current.state.isExpanded).toBe(false);
    expect(result.current.state.isActive).toBe(false);
    expect(result.current.state.testValue).toBe(0);
  });

  it('handles card expansion and collapse', () => {
    const mockOnCardStateChange = jest.fn();
    const { result } = renderHook(() =>
      useBaseActivityCard(
        initialState,
        storageKeys,
        'test',
        'test-baby-id',
        mockOnCardStateChange
      )
    );

    // Test expansion
    act(() => {
      result.current.handleCardExpand();
    });

    expect(mockOnCardStateChange).toHaveBeenCalledWith(true);

    // Test collapse
    act(() => {
      result.current.handleCardCollapse();
    });

    expect(mockOnCardStateChange).toHaveBeenCalledWith(false);
  });

  it('creates session correctly', async () => {
    const { result } = renderHook(() =>
      useBaseActivityCard(
        initialState,
        storageKeys,
        'test',
        'test-baby-id'
      )
    );

    let sessionId: string = '';

    await act(async () => {
      sessionId = await result.current.createSession({ testData: 'test' });
    });

    expect(sessionId).toBe('mock-base-session-id-12345');
    expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
      'test_activity_session_mock-base-session-id-12345',
      expect.stringContaining('test-baby-id')
    );
  });

  it('updates session metadata correctly', async () => {
    const { result } = renderHook(() =>
      useBaseActivityCard(
        initialState,
        storageKeys,
        'test',
        'test-baby-id'
      )
    );

    // Mock existing session data
    mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify({
      id: 'test-session',
      metadata: { oldData: 'old' },
    }));

    await act(async () => {
      await result.current.updateSessionMetadata('test-session', { newData: 'new' });
    });

    expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
      'test_activity_session_test-session',
      expect.stringContaining('newData":"new')
    );
  });

  it('completes session correctly', async () => {
    const { result } = renderHook(() =>
      useBaseActivityCard(
        initialState,
        storageKeys,
        'test',
        'test-baby-id'
      )
    );

    // Mock existing session data
    mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify({
      id: 'test-session',
      endTime: null,
    }));

    await act(async () => {
      await result.current.completeSession('test-session', { finalData: 'final' });
    });

    expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
      'test_activity_session_test-session',
      expect.stringContaining('endTime')
    );
    expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
      'test_activity_session_test-session',
      expect.stringContaining('completedAt')
    );
  });

  it('formats duration correctly', () => {
    const { result } = renderHook(() =>
      useBaseActivityCard(
        initialState,
        storageKeys,
        'test',
        'test-baby-id'
      )
    );

    expect(result.current.formatDuration(0)).toBe('00:00');
    expect(result.current.formatDuration(65)).toBe('01:05');
    expect(result.current.formatDuration(3661)).toBe('61:01'); // Over an hour
  });

  it('displays last activity time correctly', () => {
    const { result } = renderHook(() =>
      useBaseActivityCard(
        initialState,
        storageKeys,
        'test',
        'test-baby-id'
      )
    );

    expect(result.current.getLastActivityDisplay()).toBe('Never');

    // Test with recent time (would need to mock Date.now for precise testing)
    const recentState = { ...initialState, lastActivityTime: Date.now() - 30000 };
    const { result: recentResult } = renderHook(() =>
      useBaseActivityCard(
        recentState,
        storageKeys,
        'test',
        'test-baby-id'
      )
    );

    expect(recentResult.current.getLastActivityDisplay()).toBe('Just now');
  });

  it('resets state correctly', async () => {
    const { result } = renderHook(() =>
      useBaseActivityCard(
        { ...initialState, isActive: true, testValue: 42 },
        storageKeys,
        'test',
        'test-baby-id'
      )
    );

    expect(result.current.state.isActive).toBe(true);
    expect(result.current.state.testValue).toBe(42);

    await act(async () => {
      await result.current.resetState();
    });

    expect(result.current.state.isActive).toBe(false);
    expect(result.current.state.testValue).toBe(0);
    expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('test_activity_state');
  });

  it('handles auto-collapse timer', () => {
    jest.useFakeTimers();
    const mockOnCardStateChange = jest.fn();

    const { result } = renderHook(() =>
      useBaseActivityCard(
        initialState,
        storageKeys,
        'test',
        'test-baby-id',
        mockOnCardStateChange
      )
    );

    // Expand card
    act(() => {
      result.current.handleCardExpand();
    });

    expect(mockOnCardStateChange).toHaveBeenCalledWith(true);

    // Fast-forward 30 seconds
    act(() => {
      jest.advanceTimersByTime(30000);
    });

    expect(mockOnCardStateChange).toHaveBeenCalledWith(false);

    jest.useRealTimers();
  });

  it('handles AsyncStorage errors gracefully', async () => {
    mockAsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    renderHook(() =>
      useBaseActivityCard(
        initialState,
        storageKeys,
        'test',
        'test-baby-id'
      )
    );

    // Wait for the async operation to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(consoleSpy).toHaveBeenCalledWith('Failed to load test state:', expect.any(Error));

    consoleSpy.mockRestore();
  });
});
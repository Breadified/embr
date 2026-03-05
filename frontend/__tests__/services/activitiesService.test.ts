import { ActivitiesService } from '../../services/activitiesService';
import { supabase } from '../../services/supabase';

// Mock the supabase client
jest.mock('../../services/supabase', () => ({
  supabase: {
    rpc: jest.fn(),
  },
}));

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('ActivitiesService', () => {
  const mockBabyId = 'test-baby-id';
  const mockSessionId = 'test-session-id';
  const mockClientId = 'test-client-id';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('startSession', () => {
    it('starts a session with minimal parameters', async () => {
      mockSupabase.rpc.mockResolvedValue({ 
        data: mockSessionId, 
        error: null 
      });

      const result = await ActivitiesService.startSession(
        mockBabyId,
        'nursing'
      );

      expect(mockSupabase.rpc).toHaveBeenCalledWith('start_activity_session', {
        p_baby_id: mockBabyId,
        p_activity_type: 'nursing',
      });
      expect(result).toBe(mockSessionId);
    });

    it('starts a session with all parameters', async () => {
      const metadata = { currentSide: 'left', totalDuration: 0 };
      mockSupabase.rpc.mockResolvedValue({ 
        data: mockSessionId, 
        error: null 
      });

      const result = await ActivitiesService.startSession(
        mockBabyId,
        'nursing',
        metadata,
        mockClientId
      );

      expect(mockSupabase.rpc).toHaveBeenCalledWith('start_activity_session', {
        p_baby_id: mockBabyId,
        p_activity_type: 'nursing',
        p_metadata: metadata,
        p_client_id: mockClientId,
      });
      expect(result).toBe(mockSessionId);
    });

    it('throws error when RPC call fails', async () => {
      const errorMessage = 'Database connection failed';
      mockSupabase.rpc.mockResolvedValue({ 
        data: null, 
        error: { message: errorMessage } 
      });

      await expect(
        ActivitiesService.startSession(mockBabyId, 'nursing')
      ).rejects.toThrow(`Failed to start session: ${errorMessage}`);
    });

    it('handles different activity types', async () => {
      mockSupabase.rpc.mockResolvedValue({ 
        data: mockSessionId, 
        error: null 
      });

      await ActivitiesService.startSession(mockBabyId, 'bottle');

      expect(mockSupabase.rpc).toHaveBeenCalledWith('start_activity_session', {
        p_baby_id: mockBabyId,
        p_activity_type: 'bottle',
      });
    });
  });

  describe('endSession', () => {
    it('ends a session with minimal parameters', async () => {
      mockSupabase.rpc.mockResolvedValue({ 
        data: true, 
        error: null 
      });

      const result = await ActivitiesService.endSession(mockSessionId);

      expect(mockSupabase.rpc).toHaveBeenCalledWith('end_activity_session', {
        p_session_id: mockSessionId,
      });
      expect(result).toBe(true);
    });

    it('ends a session with end time and metadata', async () => {
      const endTime = new Date().toISOString();
      const finalMetadata = { totalDuration: 300, leftBreast: { duration: 180 } };
      
      mockSupabase.rpc.mockResolvedValue({ 
        data: true, 
        error: null 
      });

      const result = await ActivitiesService.endSession(
        mockSessionId, 
        endTime, 
        finalMetadata
      );

      expect(mockSupabase.rpc).toHaveBeenCalledWith('end_activity_session', {
        p_session_id: mockSessionId,
        p_end_time: endTime,
        p_final_metadata: finalMetadata,
      });
      expect(result).toBe(true);
    });

    it('throws error when RPC call fails', async () => {
      const errorMessage = 'Session not found';
      mockSupabase.rpc.mockResolvedValue({ 
        data: null, 
        error: { message: errorMessage } 
      });

      await expect(
        ActivitiesService.endSession(mockSessionId)
      ).rejects.toThrow(`Failed to end session: ${errorMessage}`);
    });
  });

  describe('getActiveSessions', () => {
    it('retrieves active sessions successfully', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          activity_type: 'nursing',
          baby_id: mockBabyId,
          started_at: new Date().toISOString(),
          ended_at: null,
          metadata: { currentSide: 'left' },
        },
      ];

      mockSupabase.rpc.mockResolvedValue({ 
        data: mockSessions, 
        error: null 
      });

      const result = await ActivitiesService.getActiveSessions(mockBabyId);

      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_active_sessions', {
        p_baby_id: mockBabyId,
      });
      expect(result).toEqual(mockSessions);
    });

    it('throws error when retrieval fails', async () => {
      const errorMessage = 'Permission denied';
      mockSupabase.rpc.mockResolvedValue({ 
        data: null, 
        error: { message: errorMessage } 
      });

      await expect(
        ActivitiesService.getActiveSessions(mockBabyId)
      ).rejects.toThrow(`Failed to get active sessions: ${errorMessage}`);
    });
  });

  describe('getRecentSessions', () => {
    it('retrieves recent sessions with default parameters', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          activity_type: 'nursing',
          baby_id: mockBabyId,
          started_at: new Date(Date.now() - 60000).toISOString(),
          ended_at: new Date().toISOString(),
        },
      ];

      mockSupabase.rpc.mockResolvedValue({ 
        data: mockSessions, 
        error: null 
      });

      const result = await ActivitiesService.getRecentSessions(mockBabyId);

      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_recent_sessions', {
        p_baby_id: mockBabyId,
        p_hours_back: 24,
        p_limit: 50,
      });
      expect(result).toEqual(mockSessions);
    });

    it('retrieves recent sessions with custom parameters', async () => {
      const mockSessions: unknown[] = [];
      
      mockSupabase.rpc.mockResolvedValue({ 
        data: mockSessions, 
        error: null 
      });

      const result = await ActivitiesService.getRecentSessions(
        mockBabyId, 
        12, // 12 hours back
        25  // limit 25
      );

      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_recent_sessions', {
        p_baby_id: mockBabyId,
        p_hours_back: 12,
        p_limit: 25,
      });
      expect(result).toEqual(mockSessions);
    });
  });

  describe('updateSessionMetadata', () => {
    it('updates session metadata successfully', async () => {
      const metadata = { currentSide: 'right', duration: 120 };
      
      mockSupabase.rpc.mockResolvedValue({ 
        data: true, 
        error: null 
      });

      const result = await ActivitiesService.updateSessionMetadata(
        mockSessionId, 
        metadata
      );

      expect(mockSupabase.rpc).toHaveBeenCalledWith('update_session_metadata', {
        p_session_id: mockSessionId,
        p_metadata: metadata,
      });
      expect(result).toBe(true);
    });

    it('throws error when update fails', async () => {
      const errorMessage = 'Invalid metadata format';
      mockSupabase.rpc.mockResolvedValue({ 
        data: null, 
        error: { message: errorMessage } 
      });

      await expect(
        ActivitiesService.updateSessionMetadata(mockSessionId, {})
      ).rejects.toThrow(`Failed to update session: ${errorMessage}`);
    });
  });

  describe('pauseSession', () => {
    it('pauses session without metadata', async () => {
      mockSupabase.rpc.mockResolvedValue({ 
        data: true, 
        error: null 
      });

      const result = await ActivitiesService.pauseSession(mockSessionId);

      expect(mockSupabase.rpc).toHaveBeenCalledWith('pause_session', {
        p_session_id: mockSessionId,
      });
      expect(result).toBe(true);
    });

    it('pauses session with metadata', async () => {
      const pauseMetadata = { reason: 'baby_crying' };
      
      mockSupabase.rpc.mockResolvedValue({ 
        data: true, 
        error: null 
      });

      const result = await ActivitiesService.pauseSession(
        mockSessionId, 
        pauseMetadata
      );

      expect(mockSupabase.rpc).toHaveBeenCalledWith('pause_session', {
        p_session_id: mockSessionId,
        p_pause_metadata: pauseMetadata,
      });
      expect(result).toBe(true);
    });
  });

  describe('resumeSession', () => {
    it('resumes session without metadata', async () => {
      const newSegmentId = 'new-segment-id';
      
      mockSupabase.rpc.mockResolvedValue({ 
        data: newSegmentId, 
        error: null 
      });

      const result = await ActivitiesService.resumeSession(mockSessionId);

      expect(mockSupabase.rpc).toHaveBeenCalledWith('resume_session', {
        p_session_id: mockSessionId,
      });
      expect(result).toBe(newSegmentId);
    });

    it('resumes session with metadata', async () => {
      const resumeMetadata = { reason: 'baby_settled' };
      const newSegmentId = 'new-segment-id';
      
      mockSupabase.rpc.mockResolvedValue({ 
        data: newSegmentId, 
        error: null 
      });

      const result = await ActivitiesService.resumeSession(
        mockSessionId, 
        resumeMetadata
      );

      expect(mockSupabase.rpc).toHaveBeenCalledWith('resume_session', {
        p_session_id: mockSessionId,
        p_resume_metadata: resumeMetadata,
      });
      expect(result).toBe(newSegmentId);
    });
  });

  describe('Type Safety', () => {
    it('enforces correct activity type values', async () => {
      mockSupabase.rpc.mockResolvedValue({ 
        data: mockSessionId, 
        error: null 
      });

      // These should compile without issues
      await ActivitiesService.startSession(mockBabyId, 'nursing');
      await ActivitiesService.startSession(mockBabyId, 'bottle');
      await ActivitiesService.startSession(mockBabyId, 'sleep');
      await ActivitiesService.startSession(mockBabyId, 'nappy');
      await ActivitiesService.startSession(mockBabyId, 'tummy_time');

      expect(mockSupabase.rpc).toHaveBeenCalledTimes(5);
    });

    it('handles Json metadata type correctly', async () => {
      mockSupabase.rpc.mockResolvedValue({ 
        data: mockSessionId, 
        error: null 
      });

      // These should all be valid Json types
      const validMetadata = [
        null,
        { simple: 'string' },
        { number: 123 },
        { boolean: true },
        { nested: { object: { with: 'values' } } },
        { array: [1, 2, 3, 'string', true] },
        { mixed: { num: 1, str: 'text', bool: false, arr: [1, 2], obj: { nested: true } } },
      ];

      for (const metadata of validMetadata) {
        await ActivitiesService.startSession(mockBabyId, 'nursing', metadata);
      }

      expect(mockSupabase.rpc).toHaveBeenCalledTimes(validMetadata.length);
    });
  });
});
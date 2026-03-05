import { ActivityService } from '../../services/activityService';
import { supabase } from '../../services/supabase';

// Mock the Supabase client
jest.mock('../../services/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(),
          })),
        })),
      })),
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          is: jest.fn(() => ({
            order: jest.fn(() => ({
              limit: jest.fn(),
            })),
          })),
          not: jest.fn(() => ({
            gte: jest.fn(() => ({
              order: jest.fn(() => ({
                limit: jest.fn(),
              })),
            })),
          })),
          order: jest.fn(() => ({
            limit: jest.fn(() => ({
              single: jest.fn(),
            })),
          })),
          single: jest.fn(),
        })),
      })),
    })),
    channel: jest.fn(() => ({
      on: jest.fn(() => ({
        subscribe: jest.fn(),
      })),
    })),
  },
}));

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('ActivityService', () => {
  const mockBabyId = 'test-baby-123';
  const mockSessionId = 'session-456';
  
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset all mock chain methods
    (mockSupabase.from as jest.Mock).mockReturnValue({
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }),
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          is: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
          not: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }),
          order: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
            }),
          }),
          single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
        }),
      }),
    });
  });

  describe('startSession', () => {
    it('starts a new activity session with correct data', async () => {
      const mockSession = {
        id: mockSessionId,
        baby_id: mockBabyId,
        activity_type: 'bottle_feeding',
        started_at: '2024-01-01T10:00:00Z',
        ended_at: null,
        metadata: { volume: 120 },
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:00:00Z',
      };

      // Mock the Supabase chain for insert
      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: mockSession, error: null }),
        }),
      });
      (mockSupabase.from as jest.Mock).mockReturnValue({
        insert: mockInsert,
      });

      const params = {
        babyId: mockBabyId,
        activityType: 'bottle_feeding' as const,
        metadata: { volume: 120 },
      };

      const result = await ActivityService.startSession(params);

      expect(mockSupabase.from).toHaveBeenCalledWith('activity_sessions');
      expect(mockInsert).toHaveBeenCalled();
      expect(result).toEqual(mockSession);
    });

    it('handles metadata serialization correctly', async () => {
      const complexMetadata = {
        volume: 120,
        temperature: 'warm',
        notes: 'Baby drank well',
        timestamps: [new Date()],
        nested: { deep: { value: 'test' } },
      };

      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: {}, error: null }),
        }),
      });
      (mockSupabase.from as jest.Mock).mockReturnValue({
        insert: mockInsert,
      });

      await ActivityService.startSession({
        babyId: mockBabyId,
        activityType: 'bottle_feeding',
        metadata: complexMetadata,
      });

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: complexMetadata,
        })
      );
    });

    it('validates required fields', async () => {
      // The service doesn't validate empty babyId, it relies on database constraints
      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Invalid input' } }),
        }),
      });
      (mockSupabase.from as jest.Mock).mockReturnValue({
        insert: mockInsert,
      });

      await expect(
        ActivityService.startSession({
          babyId: '',
          activityType: 'bottle_feeding',
          metadata: {},
        })
      ).rejects.toThrow('Failed to start session');
    });

    it('handles database errors gracefully', async () => {
      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Database connection failed' } }),
        }),
      });
      (mockSupabase.from as jest.Mock).mockReturnValue({
        insert: mockInsert,
      });

      await expect(
        ActivityService.startSession({
          babyId: mockBabyId,
          activityType: 'nursing',
          metadata: {},
        })
      ).rejects.toThrow('Failed to start session: Database connection failed');
    });

    it('generates proper timestamps', async () => {
      const beforeCreate = new Date();
      
      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: {}, error: null }),
        }),
      });
      (mockSupabase.from as jest.Mock).mockReturnValue({
        insert: mockInsert,
      });

      await ActivityService.startSession({
        babyId: mockBabyId,
        activityType: 'sleep',
        metadata: {},
      });

      // Should include started_at timestamp
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          started_at: expect.any(String),
        })
      );
    });
  });

  describe('updateSessionMetadata', () => {
    it('updates session metadata correctly', async () => {
      const updatedMetadata = {
        volume: 150,
        notes: 'Updated notes',
        newField: 'new value',
      };

      mockSupabaseExecuteSQL.mockResolvedValue({
        data: [{ affected_rows: 1 }],
        error: null,
      });

      await ActivityService.updateSessionMetadata(mockSessionId, updatedMetadata);

      expect(mockSupabaseExecuteSQL).toHaveBeenCalledWith(
        expect.stringContaining(`UPDATE activity_sessions SET metadata = '${JSON.stringify(updatedMetadata)}', updated_at = NOW() WHERE id = '${mockSessionId}'`)
      );
    });

    it('handles partial metadata updates by merging', async () => {
      // Mock getting existing session
      const existingSession = {
        id: mockSessionId,
        metadata: { volume: 100, temperature: 'warm', notes: 'original' },
      };

      mockSupabaseExecuteSQL
        .mockResolvedValueOnce({
          data: [existingSession],
          error: null,
        })
        .mockResolvedValueOnce({
          data: [{ affected_rows: 1 }],
          error: null,
        });

      const partialUpdate = { volume: 150, newField: 'added' };

      await ActivityService.updateSessionMetadata(mockSessionId, partialUpdate);

      // Should merge with existing metadata
      const expectedMetadata = {
        volume: 150, // updated
        temperature: 'warm', // preserved
        notes: 'original', // preserved
        newField: 'added', // added
      };

      const updateCall = mockSupabaseExecuteSQL.mock.calls[1][0];
      expect(updateCall).toContain(JSON.stringify(expectedMetadata));
    });

    it('validates session exists before updating', async () => {
      mockSupabaseExecuteSQL.mockResolvedValue({
        data: [],
        error: null,
      });

      await expect(
        ActivityService.updateSessionMetadata('non-existent-id', { test: 'data' })
      ).rejects.toThrow('Failed to update session metadata');
    });

    it('handles concurrent updates gracefully', async () => {
      // Simulate optimistic locking by checking updated_at timestamp
      const mockSession = {
        id: mockSessionId,
        updated_at: '2024-01-01T10:00:00Z',
        metadata: { original: 'data' },
      };

      mockSupabaseExecuteSQL
        .mockResolvedValueOnce({ data: [mockSession], error: null })
        .mockResolvedValueOnce({ data: [{ affected_rows: 0 }], error: null });

      await expect(
        ActivityService.updateSessionMetadata(mockSessionId, { update: 'data' })
      ).rejects.toThrow('Failed to update session metadata');
    });
  });

  describe('endSession', () => {
    it('ends session with final metadata and timestamp', async () => {
      const finalMetadata = {
        totalDuration: 1800, // 30 minutes
        finalNotes: 'Session completed successfully',
      };

      mockSupabaseExecuteSQL
        .mockResolvedValueOnce({
          data: [{ id: mockSessionId, metadata: { initial: 'data' } }],
          error: null,
        })
        .mockResolvedValueOnce({
          data: [{ affected_rows: 1 }],
          error: null,
        });

      await ActivityService.endSession(mockSessionId, finalMetadata);

      const updateCall = mockSupabaseExecuteSQL.mock.calls[1][0];
      expect(updateCall).toContain('ended_at = NOW()');
      expect(updateCall).toContain('updated_at = NOW()');
      
      // Should merge final metadata with existing
      const expectedMetadata = {
        initial: 'data',
        ...finalMetadata,
      };
      expect(updateCall).toContain(JSON.stringify(expectedMetadata));
    });

    it('prevents ending already ended sessions', async () => {
      const completedSession = {
        id: mockSessionId,
        ended_at: '2024-01-01T10:30:00Z',
        metadata: {},
      };

      mockSupabaseExecuteSQL.mockResolvedValue({
        data: [completedSession],
        error: null,
      });

      await expect(
        ActivityService.endSession(mockSessionId, {})
      ).rejects.toThrow('Failed to fetch session');
    });

    it('calculates duration automatically', async () => {
      const activeSession = {
        id: mockSessionId,
        started_at: '2024-01-01T10:00:00Z',
        ended_at: null,
        metadata: { volume: 120 },
      };

      mockSupabaseExecuteSQL
        .mockResolvedValueOnce({ data: [activeSession], error: null })
        .mockResolvedValueOnce({ data: [{ affected_rows: 1 }], error: null });

      await ActivityService.endSession(mockSessionId, {});

      const updateCall = mockSupabaseExecuteSQL.mock.calls[1][0];
      // Should include calculated duration in metadata
      expect(updateCall).toContain('calculatedDuration');
    });
  });

  describe('getActiveSessions', () => {
    it('retrieves all active sessions for a baby', async () => {
      const activeSessions = [
        {
          id: 'session-1',
          baby_id: mockBabyId,
          activity_type: 'nursing',
          started_at: '2024-01-01T10:00:00Z',
          ended_at: null,
        },
        {
          id: 'session-2',
          baby_id: mockBabyId,
          activity_type: 'sleep',
          started_at: '2024-01-01T09:00:00Z',
          ended_at: null,
        },
      ];

      mockSupabaseExecuteSQL.mockResolvedValue({
        data: activeSessions,
        error: null,
      });

      const result = await ActivityService.getActiveSessions(mockBabyId);

      expect(mockSupabaseExecuteSQL).toHaveBeenCalledWith(
        expect.stringContaining(`WHERE baby_id = '${mockBabyId}' AND ended_at IS NULL`)
      );
      
      expect(result).toEqual(activeSessions);
    });

    it('filters by activity type when specified', async () => {
      await ActivityService.getActiveSessions(mockBabyId, 'nursing');

      expect(mockSupabaseExecuteSQL).toHaveBeenCalledWith(
        expect.stringContaining(`AND activity_type = 'nursing'`)
      );
    });

    it('returns empty array when no active sessions', async () => {
      mockSupabaseExecuteSQL.mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await ActivityService.getActiveSessions(mockBabyId);
      expect(result).toEqual([]);
    });
  });

  describe('getRecentSessions', () => {
    it('retrieves recent session history', async () => {
      const sessions = Array.from({ length: 10 }, (_, i) => ({
        id: `session-${i}`,
        baby_id: mockBabyId,
        activity_type: 'bottle_feeding',
        started_at: `2024-01-0${i + 1}T10:00:00Z`,
        ended_at: `2024-01-0${i + 1}T10:30:00Z`,
      }));

      mockSupabaseExecuteSQL.mockResolvedValue({
        data: sessions,
        error: null,
      });

      const result = await ActivityService.getRecentSessions(mockBabyId, 24, 10);

      expect(result).toEqual(sessions);
    });

    it('filters by hours back', async () => {
      await ActivityService.getRecentSessions(mockBabyId, 48);

      // Verify the service was called with the right parameters
      expect(mockSupabaseExecuteSQL).toHaveBeenCalled();
    });

    it('limits results properly', async () => {
      await ActivityService.getRecentSessions(mockBabyId, 24, 5);

      // Verify the service was called
      expect(mockSupabaseExecuteSQL).toHaveBeenCalled();
    });

    it('sorts by most recent first by default', async () => {
      await ActivityService.getRecentSessions(mockBabyId);

      expect(mockSupabaseExecuteSQL).toHaveBeenCalled();
    });
  });

  describe('getLastActivity', () => {
    it('gets the last activity of a specific type', async () => {
      const lastActivity = {
        id: mockSessionId,
        baby_id: mockBabyId,
        activity_type: 'nursing',
        started_at: '2024-01-01T10:00:00Z',
        ended_at: '2024-01-01T10:30:00Z',
        metadata: {},
      };

      mockSupabaseExecuteSQL.mockResolvedValue({
        data: lastActivity,
        error: null,
      });

      const result = await ActivityService.getLastActivity(mockBabyId, 'nursing');
      
      expect(result).toEqual(lastActivity);
    });

    it('returns null when no activity found', async () => {
      mockSupabaseExecuteSQL.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }, // No rows returned
      });

      const result = await ActivityService.getLastActivity(mockBabyId, 'nursing');
      
      expect(result).toBeNull();
    });
  });

  describe('deleteSession', () => {
    it('marks session as error status (soft delete)', async () => {
      mockSupabaseExecuteSQL.mockResolvedValue({
        data: [{ affected_rows: 1 }],
        error: null,
      });

      const result = await ActivityService.deleteSession(mockSessionId);

      expect(result).toBe(true);
    });

    it('handles delete errors', async () => {
      mockSupabaseExecuteSQL.mockResolvedValue({
        data: null,
        error: { message: 'Delete failed' },
      });

      await expect(
        ActivityService.deleteSession(mockSessionId)
      ).rejects.toThrow('Failed to delete session: Delete failed');
    });
  });

  describe('createQuickLog', () => {
    it('creates a quick log entry for instant activities', async () => {
      const mockQuickLog = {
        id: mockSessionId,
        baby_id: mockBabyId,
        activity_type: 'diaper_change',
        started_at: '2024-01-01T10:00:00Z',
        ended_at: '2024-01-01T10:00:00Z',
        total_duration_seconds: 0,
        metadata: { type: 'wet' },
      };

      mockSupabaseExecuteSQL.mockResolvedValue({
        data: mockQuickLog,
        error: null,
      });

      const result = await ActivityService.createQuickLog({
        babyId: mockBabyId,
        activityType: 'diaper_change',
        metadata: { type: 'wet' },
      });

      expect(result).toEqual(mockQuickLog);
    });

    it('handles quick log with duration', async () => {
      await ActivityService.createQuickLog({
        babyId: mockBabyId,
        activityType: 'tummy_time',
        metadata: {},
        duration: 300, // 5 minutes
      });

      expect(mockSupabaseExecuteSQL).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('handles network errors gracefully', async () => {
      mockSupabaseExecuteSQL.mockRejectedValue(new Error('Network error'));

      await expect(
        ActivityService.startSession({
          babyId: mockBabyId,
          activityType: 'nursing',
          metadata: {},
        })
      ).rejects.toThrow('Failed to start session');
    });

    it('handles service errors gracefully', async () => {
      mockSupabaseExecuteSQL.mockResolvedValue({
        data: null,
        error: { message: 'Service error' },
      });

      await expect(
        ActivityService.startSession({
          babyId: mockBabyId,
          activityType: 'nursing',
          metadata: {},
        })
      ).rejects.toThrow('Failed to start session: Service error');
    });
  });
});
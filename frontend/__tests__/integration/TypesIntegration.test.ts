import type { Database, Json } from '../../types/database';
import { ActivitiesService } from '../../services/activitiesService';

describe('Database Types Integration', () => {
  describe('Type Compatibility', () => {
    it('ensures Json type accepts valid JSON values', () => {
      // Test that our Json type accepts all valid JSON values
      const validJsonValues: Json[] = [
        null,
        true,
        false,
        42,
        'string',
        [],
        {},
        { key: 'value' },
        { nested: { object: true } },
        [1, 2, 3],
        ['string', 'array'],
        {
          mixed: {
            number: 123,
            string: 'text',
            boolean: true,
            array: [1, 'two', true],
            object: { nested: 'value' },
            nullValue: null,
          },
        },
      ];

      // This test passes if it compiles - proving type compatibility
      expect(validJsonValues).toBeDefined();
    });

    it('ensures ActivityType enum matches database constraints', () => {
      type ActivityType = Database['public']['Enums']['activity_type'];
      
      // Verify all expected activity types are present
      const expectedTypes: ActivityType[] = [
        'nursing',
        'bottle',
        'pumping',
        'sleep',
        'nappy',
        'tummy_time',
        'play',
        'bath',
        'walk',
        'massage',
      ];

      // This test passes if it compiles - proving enum compatibility
      expect(expectedTypes).toBeDefined();
    });

    it('ensures ActivitySession interface matches database schema', () => {
      type ActivitySession = Database['public']['Tables']['activity_sessions']['Row'];
      
      // Test that we can create a valid session object
      const mockSession: ActivitySession = {
        id: 'test-session-id',
        baby_id: 'test-baby-id',
        client_id: 'test-client-id',
        activity_type: 'nursing',
        started_at: '2023-01-01T00:00:00Z',
        ended_at: null,
        metadata: {
          currentSide: 'left',
          totalDuration: 0,
        },
        notes: null,
        total_duration_seconds: null,
        sync_status: null,
        sync_error: null,
        sync_retry_count: null,
        last_sync_attempt: null,
        created_at: null,
        updated_at: null,
      };

      expect(mockSession).toBeDefined();
      expect(mockSession.activity_type).toBe('nursing');
    });

    it('ensures nursing metadata structure is type-safe', () => {
      // Test nursing-specific metadata structure
      const nursingMetadata: Json = {
        currentSide: 'left',
        totalDuration: 120,
        leftBreast: {
          startTime: '2023-01-01T00:00:00Z',
          endTime: '2023-01-01T00:02:00Z',
          duration: 120,
        },
        rightBreast: {
          startTime: '2023-01-01T00:02:00Z',
          endTime: null,
          duration: 60,
        },
      };

      // Verify this compiles and is assignable to Json type
      expect(nursingMetadata).toBeDefined();
      expect(typeof nursingMetadata).toBe('object');
    });

    it('ensures all enum types are properly defined', () => {
      type GenderType = Database['public']['Enums']['gender_type'];
      type UnitType = Database['public']['Enums']['unit_type'];
      type SyncStatusType = Database['public']['Enums']['sync_status_type'];
      type BreastSideType = Database['public']['Enums']['breast_side_type'];

      const gender: GenderType = 'female';
      const unit: UnitType = 'ml';
      const syncStatus: SyncStatusType = 'synced';
      const breastSide: BreastSideType = 'left';

      expect(gender).toBe('female');
      expect(unit).toBe('ml');
      expect(syncStatus).toBe('synced');
      expect(breastSide).toBe('left');
    });
  });

  describe('Service Type Integration', () => {
    it('ensures ActivitiesService methods accept correct parameter types', async () => {
      // Mock the actual calls to prevent real database operations
      const originalStartSession = ActivitiesService.startSession;
      const originalUpdateMetadata = ActivitiesService.updateSessionMetadata;
      
      ActivitiesService.startSession = jest.fn().mockResolvedValue('mock-session-id');
      ActivitiesService.updateSessionMetadata = jest.fn().mockResolvedValue(true);

      try {
        // Test that these calls compile with correct types
        await ActivitiesService.startSession(
          'baby-id', 
          'nursing', 
          { currentSide: 'left' }
        );
        
        await ActivitiesService.updateSessionMetadata(
          'session-id',
          {
            currentSide: 'right',
            leftBreast: {
              duration: 120,
              startTime: '2023-01-01T00:00:00Z',
              endTime: '2023-01-01T00:02:00Z',
            },
          }
        );

        expect(ActivitiesService.startSession).toHaveBeenCalled();
        expect(ActivitiesService.updateSessionMetadata).toHaveBeenCalled();
      } finally {
        // Restore original methods
        ActivitiesService.startSession = originalStartSession;
        ActivitiesService.updateSessionMetadata = originalUpdateMetadata;
      }
    });
  });

  describe('Table Relationships', () => {
    it('ensures foreign key relationships are properly typed', () => {
      type Baby = Database['public']['Tables']['babies']['Row'];
      type ActivitySession = Database['public']['Tables']['activity_sessions']['Row'];
      type SessionSegment = Database['public']['Tables']['session_segments']['Row'];

      // Test that foreign key fields have correct types
      const baby: Baby = {
        id: 'baby-id',
        profile_id: 'profile-id',
        name: 'Test Baby',
        date_of_birth: '2023-01-01',
        gender: 'female',
        is_active: true,
        avatar_url: null,
        birth_location: null,
        client_id: null,
        color_theme: null,
        created_at: null,
        gestational_age_weeks: null,
        head_circumference_at_birth_unit: null,
        head_circumference_at_birth_value: null,
        height_at_birth_unit: null,
        height_at_birth_value: null,
        medical_notes: null,
        nickname: null,
        notes: null,
        sync_status: null,
        time_of_birth: null,
        updated_at: null,
        weight_at_birth_unit: null,
        weight_at_birth_value: null,
        archive_reason: null,
      };

      const session: ActivitySession = {
        id: 'session-id',
        baby_id: baby.id, // Should be compatible
        client_id: 'client-id',
        activity_type: 'nursing',
        started_at: '2023-01-01T00:00:00Z',
        ended_at: null,
        metadata: {},
        notes: null,
        total_duration_seconds: null,
        sync_status: null,
        sync_error: null,
        sync_retry_count: null,
        last_sync_attempt: null,
        created_at: null,
        updated_at: null,
      };

      const segment: SessionSegment = {
        id: 'segment-id',
        session_id: session.id, // Should be compatible
        client_id: 'client-id',
        started_at: '2023-01-01T00:00:00Z',
        ended_at: null,
        duration_seconds: null,
        metadata: null,
        sync_status: null,
        created_at: null,
        updated_at: null,
      };

      expect(session.baby_id).toBe(baby.id);
      expect(segment.session_id).toBe(session.id);
    });
  });

  describe('Function Parameter Types', () => {
    it('ensures database function parameters are properly typed', () => {
      type StartActivitySessionArgs = Database['public']['Functions']['start_activity_session']['Args'];
      type EndActivitySessionArgs = Database['public']['Functions']['end_activity_session']['Args'];
      type UpdateSessionMetadataArgs = Database['public']['Functions']['update_session_metadata']['Args'];

      // Test that function argument types are correct
      const startArgs: StartActivitySessionArgs = {
        p_baby_id: 'baby-id',
        p_activity_type: 'nursing',
        p_metadata: { currentSide: 'left' },
        p_client_id: 'client-id',
      };

      const endArgs: EndActivitySessionArgs = {
        p_session_id: 'session-id',
        p_end_time: '2023-01-01T00:05:00Z',
        p_final_metadata: { totalDuration: 300 },
      };

      const updateArgs: UpdateSessionMetadataArgs = {
        p_session_id: 'session-id',
        p_metadata: { currentSide: 'right' },
      };

      expect(startArgs.p_activity_type).toBe('nursing');
      expect(endArgs.p_session_id).toBe('session-id');
      expect(updateArgs.p_metadata).toEqual({ currentSide: 'right' });
    });
  });

  describe('Constants Export', () => {
    it('provides compile-time constants for enum values', async () => {
      const { Constants } = await import('../../types/database');
      
      expect(Constants.public.Enums.activity_type).toContain('nursing');
      expect(Constants.public.Enums.activity_type).toContain('bottle');
      expect(Constants.public.Enums.breast_side_type).toContain('left');
      expect(Constants.public.Enums.breast_side_type).toContain('right');
      expect(Constants.public.Enums.gender_type).toContain('male');
      expect(Constants.public.Enums.gender_type).toContain('female');
      expect(Constants.public.Enums.sync_status_type).toContain('pending');
      expect(Constants.public.Enums.sync_status_type).toContain('synced');
    });
  });
});
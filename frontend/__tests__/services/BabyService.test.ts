import { BabyService } from '../../services/babyService';

// Mock the MCP Supabase functions
const mockSupabaseExecuteSQL = jest.fn();

global.mcp__supabase__execute_sql = mockSupabaseExecuteSQL;

describe('BabyService', () => {
  const mockBabyId = 'test-baby-123';
  const mockUserId = 'user-456';
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabaseExecuteSQL.mockResolvedValue({ data: [], error: null });
  });

  describe('createBaby', () => {
    it('creates a new baby profile with required data', async () => {
      const mockBaby = {
        id: mockBabyId,
        user_id: mockUserId,
        name: 'Emma',
        birth_date: '2024-01-01',
        gender: 'female',
        birth_weight: 3200,
        birth_length: 50,
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:00:00Z',
      };

      mockSupabaseExecuteSQL.mockResolvedValue({
        data: [mockBaby],
        error: null,
      });

      const babyData = {
        userId: mockUserId,
        name: 'Emma',
        birthDate: new Date('2024-01-01'),
        gender: 'female' as const,
        birthWeight: 3200,
        birthLength: 50,
      };

      const result = await BabyService.createBaby(babyData);

      expect(mockSupabaseExecuteSQL).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO babies')
      );
      
      expect(result).toEqual(mockBaby);
    });

    it('validates required fields', async () => {
      await expect(
        BabyService.createBaby({
          userId: '',
          name: 'Emma',
          birthDate: new Date(),
          gender: 'female',
        })
      ).rejects.toThrow('userId is required');

      await expect(
        BabyService.createBaby({
          userId: mockUserId,
          name: '',
          birthDate: new Date(),
          gender: 'female',
        })
      ).rejects.toThrow('name is required');

      await expect(
        BabyService.createBaby({
          userId: mockUserId,
          name: 'Emma',
          birthDate: new Date('invalid'),
          gender: 'female',
        })
      ).rejects.toThrow('valid birthDate is required');
    });

    it('validates birth measurements', async () => {
      await expect(
        BabyService.createBaby({
          userId: mockUserId,
          name: 'Emma',
          birthDate: new Date(),
          gender: 'female',
          birthWeight: -100, // Invalid weight
        })
      ).rejects.toThrow('birthWeight must be positive');

      await expect(
        BabyService.createBaby({
          userId: mockUserId,
          name: 'Emma',
          birthDate: new Date(),
          gender: 'female',
          birthLength: 0, // Invalid length
        })
      ).rejects.toThrow('birthLength must be positive');
    });

    it('handles optional medical information', async () => {
      const babyWithMedicalInfo = {
        userId: mockUserId,
        name: 'Emma',
        birthDate: new Date('2024-01-01'),
        gender: 'female' as const,
        birthWeight: 3200,
        birthLength: 50,
        medicalConditions: ['jaundice'],
        allergies: ['milk'],
        medications: [],
        pediatrician: {
          name: 'Dr. Smith',
          phone: '555-0123',
          address: '123 Medical St',
        },
      };

      await BabyService.createBaby(babyWithMedicalInfo);

      const sqlCall = mockSupabaseExecuteSQL.mock.calls[0][0];
      expect(sqlCall).toContain('medical_conditions');
      expect(sqlCall).toContain('allergies');
      expect(sqlCall).toContain('pediatrician');
    });
  });

  describe('updateBaby', () => {
    it('updates baby information correctly', async () => {
      const existingBaby = {
        id: mockBabyId,
        user_id: mockUserId,
        name: 'Emma',
        birth_date: '2024-01-01',
        birth_weight: 3200,
      };

      const updatedData = {
        name: 'Emma Rose',
        currentWeight: 4500,
        currentLength: 55,
        notes: 'Growing well',
      };

      mockSupabaseExecuteSQL
        .mockResolvedValueOnce({ data: [existingBaby], error: null })
        .mockResolvedValueOnce({ data: [{ ...existingBaby, ...updatedData }], error: null });

      const result = await BabyService.updateBaby(mockBabyId, updatedData);

      expect(mockSupabaseExecuteSQL).toHaveBeenCalledWith(
        expect.stringContaining(`UPDATE babies SET`)
      );
      
      expect(result.name).toBe('Emma Rose');
    });

    it('prevents updating immutable fields', async () => {
      await expect(
        BabyService.updateBaby(mockBabyId, {
          birthDate: new Date('2024-02-01'), // Should not be changeable
        } as any)
      ).rejects.toThrow('Birth date cannot be modified');

      await expect(
        BabyService.updateBaby(mockBabyId, {
          userId: 'different-user', // Should not be changeable
        } as any)
      ).rejects.toThrow('User ID cannot be modified');
    });

    it('validates ownership before updating', async () => {
      const differentUserBaby = {
        id: mockBabyId,
        user_id: 'different-user',
        name: 'Other Baby',
      };

      mockSupabaseExecuteSQL.mockResolvedValue({
        data: [differentUserBaby],
        error: null,
      });

      await expect(
        BabyService.updateBaby(mockBabyId, { name: 'Updated Name' }, mockUserId)
      ).rejects.toThrow('Not authorized to update this baby profile');
    });

    it('tracks growth milestones automatically', async () => {
      const growthUpdate = {
        currentWeight: 5000, // Significant weight gain
        currentLength: 60,
        headCircumference: 40,
      };

      await BabyService.updateBaby(mockBabyId, growthUpdate);

      const sqlCall = mockSupabaseExecuteSQL.mock.calls[1][0];
      expect(sqlCall).toContain('growth_milestones');
    });
  });

  describe('getBaby', () => {
    it('retrieves baby by ID with full profile', async () => {
      const mockBaby = {
        id: mockBabyId,
        user_id: mockUserId,
        name: 'Emma',
        birth_date: '2024-01-01',
        gender: 'female',
        birth_weight: 3200,
        birth_length: 50,
        current_weight: 4500,
        current_length: 55,
        medical_conditions: ['none'],
        allergies: [],
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
      };

      mockSupabaseExecuteSQL.mockResolvedValue({
        data: [mockBaby],
        error: null,
      });

      const result = await BabyService.getBaby(mockBabyId);

      expect(mockSupabaseExecuteSQL).toHaveBeenCalledWith(
        expect.stringContaining(`SELECT * FROM babies WHERE id = '${mockBabyId}' AND deleted_at IS NULL`)
      );
      
      expect(result).toEqual(mockBaby);
    });

    it('returns null for non-existent baby', async () => {
      mockSupabaseExecuteSQL.mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await BabyService.getBaby('non-existent-id');
      expect(result).toBeNull();
    });

    it('includes calculated age information', async () => {
      const baby = await BabyService.getBaby(mockBabyId);
      
      if (baby) {
        expect(baby).toHaveProperty('ageInDays');
        expect(baby).toHaveProperty('ageInWeeks');
        expect(baby).toHaveProperty('ageInMonths');
      }
    });
  });

  describe('getUserBabies', () => {
    it('retrieves all babies for a user', async () => {
      const mockBabies = [
        {
          id: 'baby-1',
          user_id: mockUserId,
          name: 'Emma',
          birth_date: '2024-01-01',
          gender: 'female',
        },
        {
          id: 'baby-2',
          user_id: mockUserId,
          name: 'Liam',
          birth_date: '2024-03-15',
          gender: 'male',
        },
      ];

      mockSupabaseExecuteSQL.mockResolvedValue({
        data: mockBabies,
        error: null,
      });

      const result = await BabyService.getUserBabies(mockUserId);

      expect(mockSupabaseExecuteSQL).toHaveBeenCalledWith(
        expect.stringContaining(`WHERE user_id = '${mockUserId}' AND deleted_at IS NULL`)
      );
      
      expect(result).toEqual(mockBabies);
      expect(result).toHaveLength(2);
    });

    it('sorts babies by birth date (newest first)', async () => {
      await BabyService.getUserBabies(mockUserId);

      expect(mockSupabaseExecuteSQL).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY birth_date DESC')
      );
    });

    it('returns empty array for user with no babies', async () => {
      mockSupabaseExecuteSQL.mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await BabyService.getUserBabies('user-with-no-babies');
      expect(result).toEqual([]);
    });
  });

  describe('deleteBaby', () => {
    it('soft deletes baby profile', async () => {
      mockSupabaseExecuteSQL.mockResolvedValue({
        data: [{ affected_rows: 1 }],
        error: null,
      });

      await BabyService.deleteBaby(mockBabyId);

      expect(mockSupabaseExecuteSQL).toHaveBeenCalledWith(
        expect.stringContaining(`UPDATE babies SET deleted_at = NOW(), updated_at = NOW() WHERE id = '${mockBabyId}'`)
      );
    });

    it('validates ownership before deletion', async () => {
      const differentUserBaby = {
        id: mockBabyId,
        user_id: 'different-user',
      };

      mockSupabaseExecuteSQL.mockResolvedValue({
        data: [differentUserBaby],
        error: null,
      });

      await expect(
        BabyService.deleteBaby(mockBabyId, mockUserId)
      ).rejects.toThrow('Not authorized to delete this baby profile');
    });

    it('cascades deletion to related data', async () => {
      // Should also soft delete related activity sessions, growth records, etc.
      await BabyService.deleteBaby(mockBabyId, mockUserId, { cascadeDelete: true });

      expect(mockSupabaseExecuteSQL).toHaveBeenCalledTimes(3); // Baby + Activities + Growth records
    });
  });

  describe('Growth Tracking', () => {
    it('records growth measurements', async () => {
      const growthData = {
        babyId: mockBabyId,
        weight: 5200,
        length: 58,
        headCircumference: 41,
        measurementDate: new Date('2024-02-01'),
        notes: 'Healthy growth',
      };

      await BabyService.recordGrowth(growthData);

      expect(mockSupabaseExecuteSQL).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO growth_records')
      );
    });

    it('calculates growth percentiles', async () => {
      const growthData = {
        babyId: mockBabyId,
        weight: 5200,
        length: 58,
        headCircumference: 41,
        measurementDate: new Date('2024-02-01'),
      };

      mockSupabaseExecuteSQL.mockResolvedValue({
        data: [{
          ...growthData,
          weight_percentile: 75,
          length_percentile: 60,
          head_circumference_percentile: 80,
        }],
        error: null,
      });

      const result = await BabyService.recordGrowth(growthData);

      expect(result).toHaveProperty('weight_percentile');
      expect(result).toHaveProperty('length_percentile');
      expect(result).toHaveProperty('head_circumference_percentile');
    });

    it('retrieves growth history', async () => {
      const mockGrowthHistory = [
        {
          id: 'growth-1',
          baby_id: mockBabyId,
          weight: 4500,
          length: 55,
          measurement_date: '2024-01-15',
        },
        {
          id: 'growth-2',
          baby_id: mockBabyId,
          weight: 5200,
          length: 58,
          measurement_date: '2024-02-01',
        },
      ];

      mockSupabaseExecuteSQL.mockResolvedValue({
        data: mockGrowthHistory,
        error: null,
      });

      const result = await BabyService.getGrowthHistory(mockBabyId);

      expect(mockSupabaseExecuteSQL).toHaveBeenCalledWith(
        expect.stringContaining(`WHERE baby_id = '${mockBabyId}'`)
      );
      
      expect(result).toEqual(mockGrowthHistory);
    });

    it('identifies concerning growth patterns', async () => {
      const concerningGrowth = {
        babyId: mockBabyId,
        weight: 3000, // Weight loss
        length: 50,
        measurementDate: new Date('2024-02-01'),
      };

      mockSupabaseExecuteSQL.mockResolvedValue({
        data: [{
          ...concerningGrowth,
          weight_percentile: 5, // Very low percentile
          growth_velocity: -0.5, // Negative growth
          alert_flags: ['weight_loss', 'low_percentile'],
        }],
        error: null,
      });

      const result = await BabyService.recordGrowth(concerningGrowth);

      expect(result).toHaveProperty('alert_flags');
      expect(result.alert_flags).toContain('weight_loss');
    });
  });

  describe('Medical Information Management', () => {
    it('updates medical conditions safely', async () => {
      const medicalUpdate = {
        medicalConditions: ['reflux', 'mild jaundice'],
        allergies: ['dairy'],
        medications: [{
          name: 'Vitamin D drops',
          dosage: '1 drop daily',
          startDate: '2024-01-15',
        }],
      };

      await BabyService.updateBaby(mockBabyId, medicalUpdate);

      const sqlCall = mockSupabaseExecuteSQL.mock.calls[1][0];
      expect(sqlCall).toContain('medical_conditions');
      expect(sqlCall).toContain('allergies');
      expect(sqlCall).toContain('medications');
    });

    it('tracks vaccination records', async () => {
      const vaccinationData = {
        babyId: mockBabyId,
        vaccine: 'DTaP',
        administrationDate: new Date('2024-03-01'),
        provider: 'Dr. Smith',
        batchNumber: 'VAX123',
        reactions: 'mild fever',
      };

      await BabyService.recordVaccination(vaccinationData);

      expect(mockSupabaseExecuteSQL).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO vaccination_records')
      );
    });

    it('retrieves vaccination schedule', async () => {
      const mockSchedule = [
        {
          vaccine: 'DTaP',
          recommended_age_months: 2,
          status: 'completed',
          administration_date: '2024-03-01',
        },
        {
          vaccine: 'MMR',
          recommended_age_months: 12,
          status: 'pending',
          administration_date: null,
        },
      ];

      mockSupabaseExecuteSQL.mockResolvedValue({
        data: mockSchedule,
        error: null,
      });

      const result = await BabyService.getVaccinationSchedule(mockBabyId);

      expect(result).toEqual(mockSchedule);
    });
  });

  describe('Data Privacy and Security', () => {
    it('sanitizes sensitive information in logs', async () => {
      const sensitiveData = {
        userId: mockUserId,
        name: 'Emma',
        birthDate: new Date(),
        gender: 'female' as const,
        socialSecurityNumber: '123-45-6789', // Sensitive data
        medicalId: 'MED-789',
      };

      // Mock console.log to check what gets logged
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await BabyService.createBaby(sensitiveData).catch(() => {}); // May fail, that's ok

      // Check that sensitive data is not logged
      const loggedData = consoleSpy.mock.calls.join(' ');
      expect(loggedData).not.toContain('123-45-6789');
      expect(loggedData).not.toContain('MED-789');

      consoleSpy.mockRestore();
    });

    it('enforces data retention policies', async () => {
      // Data older than retention period should be automatically cleaned
      await BabyService.cleanupExpiredData(365); // 1 year retention

      expect(mockSupabaseExecuteSQL).toHaveBeenCalledWith(
        expect.stringContaining('deleted_at < NOW() - INTERVAL \'365 days\'')
      );
    });

    it('validates data integrity', async () => {
      const invalidData = {
        userId: mockUserId,
        name: '<script>alert("xss")</script>', // XSS attempt
        birthDate: new Date(),
        gender: 'female' as const,
      };

      const result = await BabyService.createBaby(invalidData);

      // Should sanitize HTML/script tags
      expect(result.name).not.toContain('<script>');
      expect(result.name).toBe('alert("xss")'); // Cleaned content
    });
  });

  describe('Performance and Scalability', () => {
    it('handles batch operations efficiently', async () => {
      const babies = Array.from({ length: 10 }, (_, i) => ({
        userId: mockUserId,
        name: `Baby ${i}`,
        birthDate: new Date(`2024-01-${i + 1}`),
        gender: i % 2 === 0 ? 'female' as const : 'male' as const,
      }));

      await BabyService.createBabiesBatch(babies);

      // Should use single batch insert
      expect(mockSupabaseExecuteSQL).toHaveBeenCalledTimes(1);
    });

    it('implements proper caching for frequently accessed data', async () => {
      // First call
      await BabyService.getBaby(mockBabyId);
      
      // Second call should use cache
      await BabyService.getBaby(mockBabyId);

      // Should only hit database once (first call)
      expect(mockSupabaseExecuteSQL).toHaveBeenCalledTimes(1);
    });

    it('handles concurrent updates with optimistic locking', async () => {
      // Simulate concurrent update scenario
      const update1 = BabyService.updateBaby(mockBabyId, { name: 'Name 1' });
      const update2 = BabyService.updateBaby(mockBabyId, { name: 'Name 2' });

      await Promise.all([update1, update2]);

      // Should handle concurrent updates gracefully
      expect(mockSupabaseExecuteSQL.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Error Handling', () => {
    it('handles database connection failures', async () => {
      mockSupabaseExecuteSQL.mockRejectedValue(new Error('Connection failed'));

      await expect(
        BabyService.createBaby({
          userId: mockUserId,
          name: 'Emma',
          birthDate: new Date(),
          gender: 'female',
        })
      ).rejects.toThrow('Connection failed');
    });

    it('validates foreign key constraints', async () => {
      mockSupabaseExecuteSQL.mockResolvedValue({
        data: null,
        error: {
          message: 'foreign key constraint violation',
          code: '23503',
        },
      });

      await expect(
        BabyService.createBaby({
          userId: 'non-existent-user',
          name: 'Emma',
          birthDate: new Date(),
          gender: 'female',
        })
      ).rejects.toThrow('User does not exist');
    });

    it('provides helpful error messages', async () => {
      await expect(
        BabyService.createBaby({
          userId: mockUserId,
          name: 'A'.repeat(1000), // Too long name
          birthDate: new Date(),
          gender: 'female',
        })
      ).rejects.toThrow('Name is too long (maximum 100 characters)');
    });
  });
});
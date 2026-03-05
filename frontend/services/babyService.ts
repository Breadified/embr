import { supabase } from './supabase';
import type { Baby, BabyInsert, BabyUpdate } from './supabase';

// Baby service for managing baby records in Supabase
export class BabyService {
  
  // Create a new baby record
  static async createBaby(data: Omit<BabyInsert, 'id' | 'created_at' | 'updated_at' | 'client_id' | 'sync_status'>): Promise<Baby> {
    // Ensure the profile exists before creating the baby
    await this.ensureProfileExists(data.profile_id);
    
    const babyData: BabyInsert = {
      ...data,
      is_active: data.is_active ?? true,
      sync_status: 'pending'
    };

    const { data: baby, error } = await supabase
      .from('babies')
      .insert(babyData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create baby: ${error.message}`);
    }

    return baby;
  }

  // Ensure profile exists for a user
  static async ensureProfileExists(profileId: string): Promise<void> {
    const { error: fetchError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', profileId)
      .single();

    if (fetchError && fetchError.code === 'PGRST116') {
      // Profile doesn't exist, create one
      const { error: createError } = await supabase
        .from('profiles')
        .insert({
          id: profileId,
          timezone: 'UTC' // Required field
        });

      if (createError) {
        throw new Error(`Failed to create profile: ${createError.message}`);
      }
    } else if (fetchError) {
      throw new Error(`Failed to check profile: ${fetchError.message}`);
    }
  }

  // Get all active babies for the current user
  static async getActiveBabies(profileId: string): Promise<Baby[]> {
    const { data: babies, error } = await supabase
      .from('babies')
      .select('*')
      .eq('profile_id', profileId)
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch babies: ${error.message}`);
    }

    return babies || [];
  }

  // Get a specific baby by ID
  static async getBaby(babyId: string): Promise<Baby | null> {
    const { data: baby, error } = await supabase
      .from('babies')
      .select('*')
      .eq('id', babyId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch baby: ${error.message}`);
    }

    return baby;
  }

  // Update baby information
  static async updateBaby(
    babyId: string, 
    updates: Partial<BabyUpdate>
  ): Promise<Baby> {
    const { data: baby, error } = await supabase
      .from('babies')
      .update({
        ...updates,
        sync_status: 'pending'
      })
      .eq('id', babyId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update baby: ${error.message}`);
    }

    return baby;
  }

  // Archive a baby (soft delete)
  static async archiveBaby(
    babyId: string, 
    reason?: string
  ): Promise<boolean> {
    const { error } = await supabase
      .from('babies')
      .update({
        is_active: false,
        archive_reason: reason || null,
        sync_status: 'pending'
      })
      .eq('id', babyId);

    if (error) {
      throw new Error(`Failed to archive baby: ${error.message}`);
    }

    return true;
  }

  // Calculate baby's age information
  static calculateAge(dateOfBirth: string) {
    const birthDate = new Date(dateOfBirth);
    const now = new Date();
    
    const diffTime = Math.abs(now.getTime() - birthDate.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30.44); // Average days per month
    const diffYears = Math.floor(diffDays / 365.25); // Account for leap years

    return {
      daysOld: diffDays,
      weeksOld: diffWeeks,
      monthsOld: diffMonths,
      yearsOld: diffYears,
      birthDate: dateOfBirth
    };
  }

  // Get age-appropriate milestones for a baby
  static getMilestones(dateOfBirth: string) {
    const { monthsOld } = this.calculateAge(dateOfBirth);
    
    if (monthsOld < 1) {
      return [
        'First smile (2-3 months)',
        'Lifting head during tummy time',
        'Following objects with eyes'
      ];
    } else if (monthsOld < 6) {
      return [
        'Rolling over (4-6 months)',
        'Sitting with support (4-6 months)',
        'Reaching for toys'
      ];
    } else if (monthsOld < 12) {
      return [
        'Crawling (6-10 months)',
        'Standing with support (8-12 months)',
        'First words (10-14 months)'
      ];
    } else {
      return [
        'Walking independently (12-18 months)',
        'Two-word phrases (18-24 months)',
        'Potty training (2-3 years)'
      ];
    }
  }

  // Subscribe to real-time changes for babies
  static subscribeToBabies(
    profileId: string, 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    callback: (payload: any) => void
  ) {
    return supabase
      .channel(`babies:profile_id=eq.${profileId}`)
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table: 'babies',
          filter: `profile_id=eq.${profileId}`
        },
        callback
      )
      .subscribe();
  }

  // Create a demo baby for testing (temporary)
  static async createDemoBaby(): Promise<Baby> {
    // First, check if we have a user session
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('No authenticated user found. Cannot create demo baby.');
    }

    // Create demo baby
    return this.createBaby({
      profile_id: user.id,
      name: 'Demo Baby',
      date_of_birth: new Date(Date.now() - (30 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]!, // 30 days ago
      gender: 'female',
      nickname: 'Little One',
      color_theme: '#FF6B6B'
    });
  }
}
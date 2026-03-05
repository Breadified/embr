import { supabase } from './supabase';
import type { Baby, BabyInsert, BabyUpdate } from './supabase';

/**
 * Service for managing babies in the BabyTrack app
 * Demonstrates proper type usage with generated database types
 */
export class BabiesService {
  /**
   * Get all active babies for the current user
   */
  static async getActiveBabies(userId: string): Promise<Baby[]> {
    const { data, error } = await supabase.rpc('get_active_babies', {
      user_id: userId,
    });

    if (error) {
      throw new Error(`Failed to fetch babies: ${error.message}`);
    }

    return data;
  }

  /**
   * Create a new baby profile
   */
  static async createBaby(babyData: BabyInsert): Promise<Baby> {
    const { data, error } = await supabase
      .from('babies')
      .insert(babyData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create baby: ${error.message}`);
    }

    return data;
  }

  /**
   * Update a baby's information
   */
  static async updateBaby(
    babyId: string,
    updates: BabyUpdate
  ): Promise<Baby> {
    const { data, error } = await supabase
      .from('babies')
      .update(updates)
      .eq('id', babyId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update baby: ${error.message}`);
    }

    return data;
  }

  /**
   * Archive a baby (soft delete)
   */
  static async archiveBaby(babyId: string, reason?: string): Promise<boolean> {
    const args: { baby_id: string; reason?: string } = { baby_id: babyId };
    if (reason !== undefined) {
      args.reason = reason;
    }
    
    const { data, error } = await supabase.rpc('archive_baby', args);

    if (error) {
      throw new Error(`Failed to archive baby: ${error.message}`);
    }

    return data;
  }

  /**
   * Calculate baby's age in months
   */
  static async getBabyAge(birthDate: string): Promise<number> {
    const { data, error } = await supabase.rpc('calculate_age_in_months', {
      birth_date: birthDate,
    });

    if (error) {
      throw new Error(`Failed to calculate age: ${error.message}`);
    }

    return data;
  }
}
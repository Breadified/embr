import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_KEY!; // FIXED: Consistent naming to match .env

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables:', {
    url: !!supabaseUrl,
    key: !!supabaseAnonKey
  });
  throw new Error('Missing Supabase environment variables - Check .env.local file');
}

console.log('✅ Supabase client initialized:', {
  url: supabaseUrl,
  keyLength: supabaseAnonKey?.length || 0
});

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Type-safe helper functions using the generated types
export type ActivitySession = Database['public']['Tables']['activity_sessions']['Row'];
export type ActivitySessionInsert = Database['public']['Tables']['activity_sessions']['Insert'];
export type ActivitySessionUpdate = Database['public']['Tables']['activity_sessions']['Update'];

export type Baby = Database['public']['Tables']['babies']['Row'];
export type BabyInsert = Database['public']['Tables']['babies']['Insert'];
export type BabyUpdate = Database['public']['Tables']['babies']['Update'];

export type Profile = Database['public']['Tables']['profiles']['Row'];

// Enums for type-safe usage
export type ActivityType = Database['public']['Enums']['activity_type'];
export type GenderType = Database['public']['Enums']['gender_type'];
export type SyncStatusType = Database['public']['Enums']['sync_status_type'];
export type UnitType = Database['public']['Enums']['unit_type'];

// Constants from the database schema
export const ACTIVITY_TYPES: ActivityType[] = [
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

export const GENDER_TYPES: GenderType[] = ['male', 'female'];

export const UNIT_TYPES: UnitType[] = ['ml', 'oz', 'kg', 'lb', 'cm', 'in'];
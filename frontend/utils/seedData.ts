// ⚠️ DEVELOPMENT ONLY - Seed Data Generator for Testing
// This file should NEVER be included in production builds

import { Alert } from 'react-native';
import { unifiedActivityStore$ } from '../hooks/useUnifiedActivity';
import { unifiedDataStore$ } from '../hooks/useUnifiedData';
import type { ActivitySession, ActivityType } from '../services/supabase';
import type { Baby } from '../services/supabase';

// Development-only import
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Chance: any = null;
if (__DEV__) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    Chance = require('chance');
  } catch {
    console.warn('Chance.js not available, using basic randomization');
  }
}

// Only allow in development mode
if (!__DEV__) {
  throw new Error('❌ Seed data generator is only available in development mode!');
}

// Configuration for realistic baby activity patterns
const ACTIVITY_PATTERNS = {
  nursing: {
    dayFrequencyHours: { min: 2, max: 4 },
    nightFrequencyHours: { min: 3, max: 5 },
    durationMinutes: { min: 10, max: 30 },
    metadata: {
      generateSides: true, // Alternate left/right
    }
  },
  bottle: {
    dayFrequencyHours: { min: 3, max: 6 },
    nightFrequencyHours: { min: 4, max: 8 },
    durationMinutes: { min: 5, max: 20 },
    metadata: {
      volumeOz: { min: 2, max: 6 },
      types: ['breast_milk', 'formula', 'mixed']
    }
  },
  sleep: {
    napDurationMinutes: { min: 30, max: 120 },
    nightSleepDurationMinutes: { min: 120, max: 360 },
    napsPerDay: { min: 2, max: 4 },
    metadata: {
      quality: ['great', 'good', 'fair', 'poor']
    }
  },
  nappy: {
    dailyCount: { min: 6, max: 10 },
    metadata: {
      types: [
        { wet: true, dirty: false },
        { wet: false, dirty: true },
        { wet: true, dirty: true }
      ]
    }
  },
  pumping: {
    dailyCount: { min: 2, max: 5 },
    durationMinutes: { min: 15, max: 30 },
    metadata: {
      volumeOz: { min: 2, max: 8 }
    }
  },
  tummy_time: {
    dailyCount: { min: 1, max: 3 },
    durationMinutes: { min: 5, max: 15 },
    metadata: {}
  }
};

// Helper functions for random generation
const chance = __DEV__ && Chance ? new Chance() : null;

const randomBetween = (min: number, max: number): number => {
  if (chance) {
    return chance.integer({ min, max });
  }
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const randomFloat = (min: number, max: number): number => {
  if (chance) {
    return chance.floating({ min, max, fixed: 2 });
  }
  return Math.random() * (max - min) + min;
};

const randomFrom = <T>(array: T[]): T => {
  if (chance) {
    return chance.pickone(array);
  }
  return array[Math.floor(Math.random() * array.length)]!;
};

const randomBool = (likelihood: number = 50): boolean => {
  if (chance) {
    return chance.bool({ likelihood });
  }
  return Math.random() * 100 < likelihood;
};

let sessionIdCounter = 0; // Ensure uniqueness across rapid calls

const generateSessionId = (): string => {
  sessionIdCounter++;
  return `seed_${Date.now()}_${sessionIdCounter}_${Math.random().toString(36).substr(2, 9)}`;
};

// Generate realistic session times with natural variations
const generateSessionTimes = (baseDate: Date, durationMinutes: number): { started_at: string; ended_at: string } => {
  // Add some random variation to make it more realistic (-5 to +5 minutes)
  const variation = randomBetween(-5, 5);
  const actualDuration = Math.max(1, durationMinutes + variation);
  
  const started_at = baseDate.toISOString();
  const ended_at = new Date(baseDate.getTime() + actualDuration * 60 * 1000).toISOString();
  
  return { started_at, ended_at };
};

// Generate metadata based on activity type
const generateMetadata = (activityType: ActivityType, previousSession?: ActivitySession): any => {
  const metadata: any = {};
  
  switch (activityType) {
    case 'nursing':
      // Alternate sides or do both
      if (previousSession?.metadata && typeof previousSession.metadata === 'object' && previousSession.metadata !== null && 'leftDuration' in previousSession.metadata) {
        // If last was left, do right
        if (previousSession.metadata.leftDuration && !previousSession.metadata.rightDuration) {
          metadata.rightDuration = randomBetween(5, 15) * 60;
        } else {
          metadata.leftDuration = randomBetween(5, 15) * 60;
        }
      } else {
        // Random side or both
        const side = randomFrom(['left', 'right', 'both']);
        if (side === 'left' || side === 'both') {
          metadata.leftDuration = randomBetween(5, 15) * 60;
        }
        if (side === 'right' || side === 'both') {
          metadata.rightDuration = randomBetween(5, 15) * 60;
        }
      }
      break;
      
    case 'bottle':
      metadata.volume = randomFloat(2, 6);
      metadata.formulaType = randomFrom(ACTIVITY_PATTERNS.bottle.metadata.types);
      break;
      
    case 'sleep':
      metadata.quality = randomFrom(ACTIVITY_PATTERNS.sleep.metadata.quality);
      break;
      
    case 'nappy':
      const type = randomFrom(ACTIVITY_PATTERNS.nappy.metadata.types);
      metadata.wet = type.wet;
      metadata.dirty = type.dirty;
      break;
      
    case 'pumping':
      metadata.leftVolume = randomFloat(1, 4);
      metadata.rightVolume = randomFloat(1, 4);
      break;
      
    case 'tummy_time':
      // No specific metadata for tummy time
      break;
  }
  
  // Occasionally add notes (10% chance)
  if (randomBool(10)) {
    const notes = [
      'Fussy today',
      'Very content',
      'Sleeping well',
      'Growing fast!',
      'Happy baby',
      'A bit cranky',
      'Eating well',
      'Good session',
      'Cluster feeding',
      'Growth spurt',
      'Teething?',
      'Very alert',
      'Lots of smiles',
      'Rolling over!',
      'Sitting up practice'
    ];
    metadata.notes = randomFrom(notes);
  }
  
  return metadata;
};

// Main seed data generator
export class SeedDataGenerator {
  private sessions: ActivitySession[] = [];
  private babyId: string | null = null;
  
  constructor() {
    if (!__DEV__) {
      throw new Error('❌ SeedDataGenerator is only available in development mode!');
    }
  }
  
  // Generate sessions for a specific number of weeks
  async generateSessions(weeksBack: number = 8): Promise<void> {
    console.log(`🌱 Generating ${weeksBack} weeks of seed data...`);
    
    // Get or create a baby
    const babies = Object.values(unifiedDataStore$.babies.peek());
    if (babies.length === 0) {
      console.log('🍼 No babies found, creating baby Lia...');
      await this.createTestBaby();
    } else {
      this.babyId = babies[0]!.id;
      console.log('🍼 Using existing baby:', babies[0]!.name, this.babyId);
    }
    
    if (!this.babyId) {
      throw new Error('Failed to get or create baby for seed data');
    }
    
    // Clear existing sessions (with confirmation)
    await this.clearExistingSessions();
    
    // Generate sessions day by day
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (weeksBack * 7));
    
    let currentDate = new Date(startDate);
    let nursingLastSide: 'left' | 'right' = 'left';
    
    while (currentDate <= endDate) {
      console.log(`📅 Generating data for ${currentDate.toLocaleDateString()}...`);
      
      // Morning routine (6 AM - 12 PM)
      const morningStart = new Date(currentDate);
      morningStart.setHours(6, randomBetween(0, 30), 0, 0);
      
      // Early morning feeding
      this.addSession('nursing', morningStart, randomBetween(15, 25), { side: nursingLastSide });
      nursingLastSide = nursingLastSide === 'left' ? 'right' : 'left';
      
      // Morning nappy change
      morningStart.setMinutes(morningStart.getMinutes() + randomBetween(30, 60));
      this.addSession('nappy', morningStart, 0);
      
      // Morning nap
      morningStart.setMinutes(morningStart.getMinutes() + randomBetween(60, 90));
      this.addSession('sleep', morningStart, randomBetween(45, 90));
      
      // Mid-morning feeding
      morningStart.setHours(9, randomBetween(0, 30), 0, 0);
      if (randomBool(30)) {
        // 30% chance of bottle
        this.addSession('bottle', morningStart, randomBetween(10, 20));
      } else {
        this.addSession('nursing', morningStart, randomBetween(15, 25), { side: nursingLastSide });
        nursingLastSide = nursingLastSide === 'left' ? 'right' : 'left';
      }
      
      // Tummy time (70% chance)
      if (randomBool(70)) {
        morningStart.setMinutes(morningStart.getMinutes() + randomBetween(30, 45));
        this.addSession('tummy_time', morningStart, randomBetween(5, 15));
      }
      
      // Afternoon routine (12 PM - 6 PM)
      const afternoonStart = new Date(currentDate);
      afternoonStart.setHours(12, randomBetween(0, 30), 0, 0);
      
      // Lunch feeding
      this.addSession('nursing', afternoonStart, randomBetween(15, 25), { side: nursingLastSide });
      nursingLastSide = nursingLastSide === 'left' ? 'right' : 'left';
      
      // Afternoon nap
      afternoonStart.setMinutes(afternoonStart.getMinutes() + randomBetween(45, 75));
      this.addSession('sleep', afternoonStart, randomBetween(60, 120));
      
      // Afternoon nappy changes (2-3)
      for (let i = 0; i < randomBetween(2, 3); i++) {
        afternoonStart.setMinutes(afternoonStart.getMinutes() + randomBetween(60, 120));
        this.addSession('nappy', afternoonStart, 0);
      }
      
      // Late afternoon feeding
      afternoonStart.setHours(15, randomBetween(0, 30), 0, 0);
      this.addSession('nursing', afternoonStart, randomBetween(15, 25), { side: nursingLastSide });
      nursingLastSide = nursingLastSide === 'left' ? 'right' : 'left';
      
      // Pumping session (40% chance)
      if (randomBool(40)) {
        afternoonStart.setMinutes(afternoonStart.getMinutes() + randomBetween(60, 90));
        this.addSession('pumping', afternoonStart, randomBetween(15, 25));
      }
      
      // Evening routine (6 PM - 10 PM)
      const eveningStart = new Date(currentDate);
      eveningStart.setHours(18, randomBetween(0, 30), 0, 0);
      
      // Dinner feeding
      this.addSession('nursing', eveningStart, randomBetween(15, 25), { side: nursingLastSide });
      nursingLastSide = nursingLastSide === 'left' ? 'right' : 'left';
      
      // Evening nappy change
      eveningStart.setMinutes(eveningStart.getMinutes() + randomBetween(30, 45));
      this.addSession('nappy', eveningStart, 0);
      
      // Bath time tummy time (30% chance)
      if (randomBool(30)) {
        eveningStart.setMinutes(eveningStart.getMinutes() + randomBetween(15, 30));
        this.addSession('tummy_time', eveningStart, randomBetween(5, 10));
      }
      
      // Bedtime routine
      eveningStart.setHours(20, randomBetween(0, 30), 0, 0);
      this.addSession('nursing', eveningStart, randomBetween(20, 30), { side: nursingLastSide });
      nursingLastSide = nursingLastSide === 'left' ? 'right' : 'left';
      
      // Night sleep (with 1-2 wake-ups)
      eveningStart.setMinutes(eveningStart.getMinutes() + randomBetween(15, 30));
      this.addSession('sleep', eveningStart, randomBetween(180, 240));
      
      // Night feeding(s)
      const nightFeedings = randomBetween(1, 2);
      for (let i = 0; i < nightFeedings; i++) {
        const nightTime = new Date(currentDate);
        nightTime.setHours(randomBetween(1, 4), randomBetween(0, 59), 0, 0);
        this.addSession('nursing', nightTime, randomBetween(10, 20), { side: nursingLastSide });
        nursingLastSide = nursingLastSide === 'left' ? 'right' : 'left';
        
        // Night nappy change (50% chance)
        if (randomBool(50)) {
          nightTime.setMinutes(nightTime.getMinutes() + 5);
          this.addSession('nappy', nightTime, 0);
        }
      }
      
      // Occasional extra pumping at night (20% chance)
      if (randomBool(20)) {
        const nightPump = new Date(currentDate);
        nightPump.setHours(randomBetween(22, 23), randomBetween(0, 59), 0, 0);
        this.addSession('pumping', nightPump, randomBetween(15, 20));
      }
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Apply all sessions to the store
    await this.applySessions();
    
    console.log(`✅ Generated ${this.sessions.length} activity sessions`);
  }
  
  private addSession(
    activityType: ActivityType,
    startTime: Date,
    durationMinutes: number,
    additionalMetadata?: any
  ): void {
    const times = generateSessionTimes(startTime, durationMinutes);
    const previousSession = this.sessions
      .filter(s => s.activity_type === activityType)
      .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())[0];
    
    const session: ActivitySession = {
      id: generateSessionId(),
      baby_id: this.babyId!,
      activity_type: activityType,
      started_at: times.started_at,
      ended_at: times.ended_at,
      total_duration_seconds: durationMinutes * 60,
      metadata: { ...generateMetadata(activityType, previousSession), ...additionalMetadata } as any,
      created_at: times.started_at,
      updated_at: times.ended_at || times.started_at,
      client_id: 'seed_generator',
      sync_status: 'synced',
      sync_retry_count: null,
      sync_error: null,
      last_sync_attempt: null,
      notes: null,
    };
    
    this.sessions.push(session);
  }
  
  private async createTestBaby(): Promise<void> {
    // Create baby "Lia" with the user's specific requirements
    const baby: Baby = {
      id: `lia_baby_${Date.now()}`,
      profile_id: 'test_profile',
      name: 'Lia',
      nickname: 'Sweetie',
      date_of_birth: '2025-04-02', // Born 2 April 2025
      gender: 'female',
      color_theme: '#EC4899', // Pink theme for Lia
      is_active: true,
      sync_status: 'synced' as 'synced' | 'pending' | 'conflict',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      client_id: 'seed_generator',
      weight_at_birth_value: 3, // 3 kg as specified
      weight_at_birth_unit: 'kg',
      height_at_birth_value: 50, // 50 cm as specified
      height_at_birth_unit: 'cm',
      head_circumference_at_birth_value: null,
      head_circumference_at_birth_unit: null,
      gestational_age_weeks: 40, // Full term
      birth_location: 'Hospital',
      archive_reason: null,
      avatar_url: null,
      notes: 'Baby Lia - Born 2 April 2025',
      medical_notes: null,
      time_of_birth: '09:30:00',
    };
    
    unifiedDataStore$.babies.set(prev => ({
      ...prev,
      [baby.id]: baby
    }));
    
    unifiedDataStore$.activeBabyId.set(baby.id);
    this.babyId = baby.id;
  }
  
  private async clearExistingSessions(): Promise<void> {
    console.log('🗑️ Clearing existing sessions...');
    unifiedActivityStore$.sessions.set({});
    unifiedActivityStore$.activeSessions.set({});
    unifiedActivityStore$.globalActiveSession.set(null);
  }
  
  private async applySessions(): Promise<void> {
    console.log('💾 Applying sessions to store...');
    
    const sessionsMap: Record<string, ActivitySession> = {};
    this.sessions.forEach(session => {
      sessionsMap[session.id] = session;
    });
    
    // Cast to the expected type for Legend State
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    unifiedActivityStore$.sessions.set(sessionsMap as any);
  }
}

// Development-only functions to trigger seed data generation
export const generateSeedData = async (weeks: number = 8): Promise<void> => {
  if (!__DEV__) {
    console.error('❌ Seed data generation is only available in development mode');
    return;
  }
  
  try {
    console.log('🌱 Starting seed data generation...');
    const generator = new SeedDataGenerator();
    await generator.generateSessions(weeks);
    
    Alert.alert(
      '✅ Seed Data Generated',
      `Successfully generated ${weeks} weeks of test data`,
      [{ text: 'OK' }]
    );
  } catch (error) {
    console.error('❌ Seed data generation failed:', error);
    Alert.alert(
      'Error',
      `Failed to generate seed data: ${error instanceof Error ? error.message : 'Unknown error'}`,
      [{ text: 'OK' }]
    );
  }
};

// Console helper for React Native Debugger
if (__DEV__) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).generateSeedData = generateSeedData;
  console.log('💡 Seed data generator available. Use: generateSeedData(weeks)');
}
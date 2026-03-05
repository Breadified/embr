// Activity types and interfaces
export type ActivityType = 'nursing' | 'bottle' | 'sleep' | 'pumping' | 'nappy' | 'tummy_time';

export interface ActivitySession {
  id: string;
  baby_id: string;
  activity_type: ActivityType;
  started_at: string;
  ended_at?: string;
  duration?: number;
  metadata?: ActivityMetadata;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ActivityMetadata {
  // Nursing specific
  leftDuration?: number;
  rightDuration?: number;
  
  // Bottle specific
  volume?: number;
  formulaType?: 'breast_milk' | 'formula' | 'mixed';
  
  // Pumping specific
  leftVolume?: number;
  rightVolume?: number;
  
  // Nappy specific
  wet?: boolean;
  dirty?: boolean;
  
  // Sleep specific
  quality?: 'great' | 'good' | 'fair' | 'poor';
  
  // Common
  notes?: string;
}

export interface ActivityCardState {
  isExpanded: boolean;
  isAnimating: boolean;
  isActive: boolean;
  lastActivity?: string;
}
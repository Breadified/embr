// App constants for BabyTrack
export const APP_CONFIG = {
  NAME: 'BabyTrack',
  VERSION: '1.0.0',
  API_TIMEOUT: 10000,
  SYNC_INTERVAL: 30000, // 30 seconds
} as const;

export const ACTIVITY_TYPES = {
  NURSING: 'nursing',
  BOTTLE: 'bottle',
  PUMPING: 'pumping',
  SLEEP: 'sleep',
  NAPPY: 'nappy',
  TUMMY_TIME: 'tummy_time',
} as const;

export const COLORS = {
  PRIMARY: '#3B82F6',
  SECONDARY: '#10B981',
  ERROR: '#EF4444',
  WARNING: '#F59E0B',
  SUCCESS: '#10B981',
  GRAY: '#6B7280',
} as const;

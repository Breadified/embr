// Utility functions for BabyTrack

export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

export const generateClientId = (): string => {
  return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Format date header - ultra-compact single line
export const formatDateHeader = (date: Date, isToday: boolean): string => {
  if (isToday) {
    return 'Today';
  }
  
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }
  
  // Ultra-compact format using locale
  const weekday = date.toLocaleDateString(undefined, { weekday: 'short' });
  const dateStr = date.toLocaleDateString(undefined, { 
    month: 'numeric', 
    day: 'numeric' 
  });
  return `${weekday} ${dateStr}`;
};

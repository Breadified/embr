import { observable } from '@legendapp/state';

// Simple app state store to validate Legend State is working
export const appState$ = observable({
  isInitialized: false,
  currentBaby: null as string | null,
  settings: {
    theme: 'light' as 'light' | 'dark' | 'system',
    notifications: true,
  },
});

// Example actions
export const appActions = {
  initialize: () => {
    appState$.isInitialized.set(true);
  },
  setCurrentBaby: (babyId: string | null) => {
    appState$.currentBaby.set(babyId);
  },
  toggleNotifications: () => {
    appState$.settings.notifications.set((current) => !current);
  },
};

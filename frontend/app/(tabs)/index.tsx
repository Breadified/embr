/**
 * Dashboard Screen - Main Home Tab
 *
 * Entry point for the authenticated app experience.
 * Shows overview of baby activities and quick actions.
 */

import { View } from 'react-native';
import { Dashboard } from '../../modules/dashboard/components/Dashboard';
import { observer } from '@legendapp/state/react';
import { useUnifiedAuth } from '../../hooks/useUnifiedAuth';
import type { User } from '@supabase/supabase-js';

export default observer(function DashboardScreen() {
  const auth = useUnifiedAuth();

  const handleSignOut = async () => {
    await auth.signOut();
  };

  // Create user object for Dashboard component
  const user: User = auth.user || {
    id: auth.deviceId || 'unknown',
    email: auth.isAnonymous ? 'guest@embr.app' : null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    app_metadata: {},
    user_metadata: { is_anonymous: auth.isAnonymous },
    aud: 'authenticated',
    role: 'authenticated',
  } as User;

  return (
    <View className="flex-1 bg-white">
      <Dashboard user={user} onSignOut={handleSignOut} />
    </View>
  );
});

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { observer } from '@legendapp/state/react';
import { useUnifiedData } from '../../hooks/useUnifiedData';

// Example component showing how EASY it is to use unified data
// Developers never think about auth/sync - it just works!
export const UnifiedDataExample: React.FC = observer(() => {
  const data = useUnifiedData();

  // Look how simple this is! No auth checks, no sync logic, no complexity!
  const handleCreateBaby = async () => {
    try {
      await data.createBaby({
        profile_id: 'dummy', // Will be set by the unified data hook
        name: 'New Baby',
        date_of_birth: new Date().toISOString().split('T')[0]!,
        gender: null,
        color_theme: '#3B82F6',
      });
      
      console.log('✅ Baby created! (Automatically synced if online + authenticated)');
    } catch (error) {
      console.error('❌ Failed to create baby:', error);
    }
  };

  const handleUpdateBaby = async () => {
    const baby = data.activeBaby;
    if (!baby) return;

    try {
      await data.updateBaby(baby.id, {
        name: `${baby.name} (Updated)`,
      });
      
      console.log('✅ Baby updated! (Automatically synced if online + authenticated)');
    } catch (error) {
      console.error('❌ Failed to update baby:', error);
    }
  };

  return (
    <View className="p-4 bg-white rounded-lg border border-gray-100 border border-gray-200">
      <Text className="text-lg font-semibold mb-4">
        🏆 Unified Data Example
      </Text>
      
      <Text className="text-sm text-gray-600 mb-4">
        This component demonstrates how developers can focus on features 
        instead of auth/sync complexity. Everything works automatically!
      </Text>
      
      {/* Data Display - Always works regardless of auth/sync state */}
      <View className="mb-4">
        <Text className="font-medium">Babies: {data.allBabies.length}</Text>
        {data.activeBaby && (
          <Text className="text-sm text-gray-600">
            Active: {data.activeBaby.name}
          </Text>
        )}
        
        {/* Sync Status - Informational only */}
        {data.syncQueueSize > 0 && (
          <Text className="text-xs text-blue-600">
            📤 {data.syncQueueSize} items queued for sync
          </Text>
        )}
      </View>

      {/* Actions - Work offline and online automatically */}
      <View className="space-y-2">
        <Pressable
          onPress={handleCreateBaby}
          className="bg-green-500 p-3 rounded-lg"
          disabled={data.loading}
        >
          <Text className="text-white font-medium text-center">
            Create Baby (Auto-Sync)
          </Text>
        </Pressable>

        <Pressable
          onPress={handleUpdateBaby}
          className="bg-blue-500 p-3 rounded-lg"
          disabled={data.loading || !data.activeBaby}
        >
          <Text className="text-white font-medium text-center">
            Update Baby (Auto-Sync)
          </Text>
        </Pressable>
      </View>

      {/* Developer Notes */}
      <View className="mt-4 p-3 bg-gray-50 rounded-lg">
        <Text className="text-xs font-semibold text-gray-700 mb-2">
          🧠 Developer Experience:
        </Text>
        <Text className="text-xs text-gray-600">
          • No auth state checks needed{'\n'}
          • No sync logic required{'\n'}
          • Works offline automatically{'\n'}
          • Syncs when online + authenticated{'\n'}
          • Realtime updates when available{'\n'}
          • Error handling built-in
        </Text>
      </View>
    </View>
  );
});

UnifiedDataExample.displayName = 'UnifiedDataExample';
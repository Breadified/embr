import { useState, useCallback } from 'react';
import { View, Text, Pressable, TextInput, Alert } from 'react-native';
import { observer } from '@legendapp/state/react';
import { useActivityCard } from '../../../hooks/useActivityCard';
import { AnimatedActivityCard } from '../../../components/shared/AnimatedActivityCard';
import type { ActivitySession } from '../../../services/supabase';

export interface NappyCardProps {
  babyId?: string; // No longer needed with unified system, kept for compatibility
  onLogComplete?: (session: ActivitySession) => void;
  disabled?: boolean;
}

// Nappy change metadata interface
interface NappyMetadata extends Record<string, unknown> {
  changeType?: 'wet' | 'soiled' | 'both' | 'clean';
  consistency?: 'liquid' | 'soft' | 'normal' | 'hard';
  color?: 'yellow' | 'brown' | 'green' | 'other';
  diaper_brand?: string;
  rash_severity?: 'none' | 'mild' | 'moderate' | 'severe';
  cream_applied?: boolean;
  notes?: string;
}

export const NappyCard = observer<NappyCardProps>(({ 
  onLogComplete,
  disabled = false 
}) => {
  // ✅ NEW UNIFIED SYSTEM - Single hook for all card and session management
  const card = useActivityCard('nappy');

  // Local state for nappy-specific inputs
  const [isLogging, setIsLogging] = useState(false);
  const [nappyMetadata, setNappyMetadata] = useState<NappyMetadata>({
    changeType: 'wet',
    consistency: 'normal',
    color: 'yellow',
    rash_severity: 'none',
    cream_applied: false
  });
  const [notes, setNotes] = useState('');

  // Handle change type selection
  const handleChangeTypeSelect = useCallback((changeType: 'wet' | 'soiled' | 'both' | 'clean') => {
    setNappyMetadata(prev => ({ ...prev, changeType }));
  }, []);

  // Handle consistency selection
  const handleConsistencySelect = useCallback((consistency: 'liquid' | 'soft' | 'normal' | 'hard') => {
    setNappyMetadata(prev => ({ ...prev, consistency }));
  }, []);

  // Handle color selection
  const handleColorSelect = useCallback((color: 'yellow' | 'brown' | 'green' | 'other') => {
    setNappyMetadata(prev => ({ ...prev, color }));
  }, []);

  // Handle rash severity selection
  const handleRashSeveritySelect = useCallback((rash_severity: 'none' | 'mild' | 'moderate' | 'severe') => {
    setNappyMetadata(prev => ({ ...prev, rash_severity }));
  }, []);

  // Handle cream applied toggle
  const handleCreamAppliedToggle = useCallback(() => {
    setNappyMetadata(prev => ({ ...prev, cream_applied: !prev.cream_applied }));
  }, []);

  // Log diaper change (instant 10-minute session that doesn't block)
  const logDiaperChange = useCallback(async () => {
    try {
      setIsLogging(true);
      
      // Create session metadata with 10-minute duration
      const sessionMetadata = {
        ...nappyMetadata,
        notes: notes || undefined,
        timestamp: new Date().toISOString(),
        completed: true,
        instant_log: true, // Mark as instant log
        duration_minutes: 10 // Default 10 minute duration
      };
      
      // Create a session that will complete immediately with 10-minute duration
      const session = await card.startSession(sessionMetadata);
      
      // Immediately end with 10-minute duration (nappy is instant log)
      if (session && session.id) {
        // Wait a tiny bit to ensure session is created
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const finalMetadata = {
          ...sessionMetadata,
          total_duration_seconds: 600 // 10 minutes
        };
        await card.endSession(finalMetadata, (session as ActivitySession).id);
        onLogComplete?.(session as ActivitySession);
      }
      
      console.log('✅ Logged diaper change');
      
      // Reset form after successful log
      setNappyMetadata({
        changeType: 'wet',
        consistency: 'normal',
        color: 'yellow',
        rash_severity: 'none',
        cream_applied: false
      });
      setNotes('');

      Alert.alert('Success', 'Diaper change logged successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to log diaper change');
      console.error('Failed to log diaper change:', error);
    } finally {
      setIsLogging(false);
    }
  }, [card, nappyMetadata, notes, onLogComplete]);

  // Get last activity from unified card system
  const lastActivity = card.lastSession 
    ? new Date((card.lastSession as ActivitySession).started_at).toLocaleDateString()
    : 'Never';

  return (
    <AnimatedActivityCard
      activityType="nappy"
      title="Diaper Change"
      subtitle="Log diaper changes"
      emoji="🚼"
      isActive={isLogging || card.hasActiveSession}
      lastActivity={lastActivity}
      disabled={disabled || card.isDisabled}
    >

      {/* Change Type Selection */}
      <View className="mb-4">
        <Text className="text-sm font-medium text-gray-700 mb-2">Change Type</Text>
        <View className="flex-row flex-wrap gap-2">
          {([
            { value: 'wet', label: 'Wet', emoji: '💧', color: 'bg-blue-500' },
            { value: 'soiled', label: 'Soiled', emoji: '💩', color: 'bg-amber-600' },
            { value: 'both', label: 'Both', emoji: '💧💩', color: 'bg-orange-500' },
            { value: 'clean', label: 'Clean', emoji: '✨', color: 'bg-green-500' }
          ] as const).map((type) => (
            <Pressable
              key={type.value}
              onPress={() => handleChangeTypeSelect(type.value)}
              disabled={disabled || card.isDisabled}
              className={`px-4 py-3 rounded-lg border ${
                nappyMetadata.changeType === type.value 
                  ? `${type.color} border-transparent` 
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <Text className={`text-center text-lg mb-1 ${
                nappyMetadata.changeType === type.value ? 'text-white' : ''
              }`}>
                {type.emoji}
              </Text>
              <Text className={`text-center text-xs font-medium ${
                nappyMetadata.changeType === type.value 
                  ? 'text-white' 
                  : 'text-gray-600'
              }`}>
                {type.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Consistency Selection (only for soiled/both) */}
      {(nappyMetadata.changeType === 'soiled' || nappyMetadata.changeType === 'both') && (
        <View className="mb-4">
          <Text className="text-sm font-medium text-gray-700 mb-2">Consistency</Text>
          <View className="flex-row gap-2">
            {([
              { value: 'liquid', label: 'Liquid', emoji: '💦' },
              { value: 'soft', label: 'Soft', emoji: '🥄' },
              { value: 'normal', label: 'Normal', emoji: '✅' },
              { value: 'hard', label: 'Hard', emoji: '🪨' }
            ] as const).map((consistency) => (
              <Pressable
                key={consistency.value}
                onPress={() => handleConsistencySelect(consistency.value)}
                disabled={disabled || card.isDisabled}
                className={`flex-1 py-2 px-2 rounded-lg border ${
                  nappyMetadata.consistency === consistency.value 
                    ? 'bg-amber-500 border-amber-500' 
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <Text className={`text-center text-sm mb-1 ${
                  nappyMetadata.consistency === consistency.value 
                    ? 'text-white' 
                    : 'text-gray-600'
                }`}>
                  {consistency.emoji}
                </Text>
                <Text className={`text-center text-xs font-medium ${
                  nappyMetadata.consistency === consistency.value 
                    ? 'text-white' 
                    : 'text-gray-600'
                }`}>
                  {consistency.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* Color Selection (only for soiled/both) */}
      {(nappyMetadata.changeType === 'soiled' || nappyMetadata.changeType === 'both') && (
        <View className="mb-4">
          <Text className="text-sm font-medium text-gray-700 mb-2">Color</Text>
          <View className="flex-row gap-2">
            {([
              { value: 'yellow', label: 'Yellow', color: 'bg-yellow-400' },
              { value: 'brown', label: 'Brown', color: 'bg-amber-700' },
              { value: 'green', label: 'Green', color: 'bg-green-600' },
              { value: 'other', label: 'Other', color: 'bg-gray-500' }
            ] as const).map((colorOption) => (
              <Pressable
                key={colorOption.value}
                onPress={() => handleColorSelect(colorOption.value)}
                disabled={disabled || card.isDisabled}
                className={`flex-1 py-3 rounded-lg border ${
                  nappyMetadata.color === colorOption.value 
                    ? `${colorOption.color} border-transparent` 
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <Text className={`text-center text-sm font-medium ${
                  nappyMetadata.color === colorOption.value 
                    ? 'text-white' 
                    : 'text-gray-600'
                }`}>
                  {colorOption.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* Rash Severity */}
      <View className="mb-4">
        <Text className="text-sm font-medium text-gray-700 mb-2">Rash Severity</Text>
        <View className="flex-row gap-2">
          {([
            { value: 'none', label: 'None', emoji: '✅', color: 'bg-green-500' },
            { value: 'mild', label: 'Mild', emoji: '😐', color: 'bg-yellow-500' },
            { value: 'moderate', label: 'Moderate', emoji: '😬', color: 'bg-orange-500' },
            { value: 'severe', label: 'Severe', emoji: '😣', color: 'bg-red-500' }
          ] as const).map((severity) => (
            <Pressable
              key={severity.value}
              onPress={() => handleRashSeveritySelect(severity.value)}
              disabled={disabled || card.isDisabled}
              className={`flex-1 py-3 rounded-lg border ${
                nappyMetadata.rash_severity === severity.value 
                  ? `${severity.color} border-transparent` 
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <Text className={`text-center text-sm mb-1 ${
                nappyMetadata.rash_severity === severity.value ? 'text-white' : ''
              }`}>
                {severity.emoji}
              </Text>
              <Text className={`text-center text-xs font-medium ${
                nappyMetadata.rash_severity === severity.value 
                  ? 'text-white' 
                  : 'text-gray-600'
              }`}>
                {severity.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Cream Applied Toggle */}
      <View className="mb-4">
        <Pressable
          onPress={handleCreamAppliedToggle}
          disabled={disabled || card.isDisabled}
          className={`flex-row items-center justify-between p-3 rounded-lg border ${
            nappyMetadata.cream_applied
              ? 'bg-blue-50 border-blue-200'
              : 'bg-gray-50 border-gray-200'
          }`}
        >
          <Text className="text-sm font-medium text-gray-700">Diaper cream applied</Text>
          <View className={`w-5 h-5 rounded border-2 items-center justify-center ${
            nappyMetadata.cream_applied
              ? 'bg-blue-500 border-blue-500'
              : 'border-gray-300'
          }`}>
            {nappyMetadata.cream_applied && (
              <Text className="text-white text-xs">✓</Text>
            )}
          </View>
        </Pressable>
      </View>

      {/* Notes Input */}
      <View className="mb-6">
        <Text className="text-sm font-medium text-gray-700 mb-2">Notes (optional)</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Add any additional notes..."
          multiline
          numberOfLines={2}
          editable={!disabled && !card.isDisabled}
          className="w-full p-3 border border-gray-200 rounded-lg bg-white text-gray-900"
        />
      </View>

      {/* Log Button */}
      <Pressable
        onPress={logDiaperChange}
        disabled={disabled || card.isDisabled || isLogging}
        className={`p-4 rounded-lg ${
          disabled || card.isDisabled || isLogging
            ? 'bg-gray-300'
            : 'bg-yellow-500'
        }`}
      >
        <Text className={`text-center font-semibold ${
          disabled || card.isDisabled || isLogging
            ? 'text-gray-500'
            : 'text-white'
        }`}>
          {isLogging ? 'Logging Change...' : 'Log Diaper Change'}
        </Text>
      </Pressable>
      
    </AnimatedActivityCard>
  );
});

export default NappyCard;
import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { observer } from '@legendapp/state/react';
import { useUnifiedData } from '../../hooks/useUnifiedData';
import type { Database } from '../../types/database';

type GenderType = Database['public']['Enums']['gender_type'];

interface BabySetupWizardProps {
  profileId: string;
  onComplete: () => void;
}

interface BabyFormData {
  name: string;
  nickname: string;
  dateOfBirth: string;
  timeOfBirth: string;
  gender: GenderType | null;
  weightValue: string;
  weightUnit: 'kg' | 'lb';
  heightValue: string;
  heightUnit: 'cm' | 'in';
}

export const BabySetupWizard: React.FC<BabySetupWizardProps> = observer(({ profileId, onComplete }) => {
  const data = useUnifiedData();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<BabyFormData>({
    name: '',
    nickname: '',
    dateOfBirth: '',
    timeOfBirth: '',
    gender: null,
    weightValue: '',
    weightUnit: 'kg',
    heightValue: '',
    heightUnit: 'cm',
  });

  const updateFormData = (updates: Partial<BabyFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleCreateBaby = async () => {
    if (!formData.name || !formData.dateOfBirth) {
      Alert.alert('Missing Information', 'Please enter at least a name and date of birth');
      return;
    }

    setIsLoading(true);
    try {
      const babyData = {
        profile_id: profileId,
        name: formData.name,
        nickname: formData.nickname || null,
        date_of_birth: formData.dateOfBirth,
        time_of_birth: formData.timeOfBirth || null,
        gender: formData.gender || 'female',
        weight_at_birth_value: formData.weightValue ? parseFloat(formData.weightValue) : null,
        weight_at_birth_unit: formData.weightValue ? formData.weightUnit : null,
        height_at_birth_value: formData.heightValue ? parseFloat(formData.heightValue) : null,
        height_at_birth_unit: formData.heightValue ? formData.heightUnit : null,
        gestational_age_weeks: null,
        birth_location: null,
        notes: null,
        medical_notes: null,
        color_theme: '#FF6B6B',
        avatar_url: null,
      };

      await data.createBaby(babyData);
      onComplete();
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to create baby profile');
    } finally {
      setIsLoading(false);
    }
  };

  const canProceedToStep2 = formData.name.trim().length > 0 && formData.dateOfBirth.length > 0;
  const canComplete = canProceedToStep2;

  if (step === 1) {
    return (
      <ScrollView className="flex-1 bg-purple-50">
        <View className="flex-1 justify-center items-center px-6 py-8">
          <View className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-sm">
            <Text className="text-2xl font-bold text-center text-purple-900 mb-2">
              Welcome to BabyTrack!
            </Text>
            <Text className="text-center text-gray-600 mb-6">
              Let&apos;s create your baby&apos;s profile
            </Text>

            <Text className="text-gray-700 font-medium mb-2">Baby&apos;s Name *</Text>
            <TextInput
              value={formData.name}
              onChangeText={(text) => updateFormData({ name: text })}
              placeholder="Enter baby&apos;s name"
              className="bg-gray-50 p-4 rounded-xl mb-4 text-gray-800"
            />

            <Text className="text-gray-700 font-medium mb-2">Nickname (optional)</Text>
            <TextInput
              value={formData.nickname}
              onChangeText={(text) => updateFormData({ nickname: text })}
              placeholder="Enter nickname"
              className="bg-gray-50 p-4 rounded-xl mb-4 text-gray-800"
            />

            <Text className="text-gray-700 font-medium mb-2">Date of Birth *</Text>
            <TextInput
              value={formData.dateOfBirth}
              onChangeText={(text) => updateFormData({ dateOfBirth: text })}
              placeholder="YYYY-MM-DD"
              className="bg-gray-50 p-4 rounded-xl mb-4 text-gray-800"
            />

            <Text className="text-gray-700 font-medium mb-2">Time of Birth (optional)</Text>
            <TextInput
              value={formData.timeOfBirth}
              onChangeText={(text) => updateFormData({ timeOfBirth: text })}
              placeholder="HH:MM (24-hour format)"
              className="bg-gray-50 p-4 rounded-xl mb-6 text-gray-800"
            />

            <Pressable
              onPress={() => setStep(2)}
              className={`p-4 rounded-xl mb-3 ${canProceedToStep2 ? 'bg-purple-600' : 'bg-gray-300'}`}
              disabled={!canProceedToStep2}
            >
              <Text className={`font-semibold text-center text-lg ${canProceedToStep2 ? 'text-white' : 'text-gray-500'}`}>
                Next
              </Text>
            </Pressable>

            <Text className="text-xs text-gray-400 text-center">
              * Required fields
            </Text>
          </View>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView className="flex-1 bg-purple-50">
      <View className="flex-1 justify-center items-center px-6 py-8">
        <View className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-sm">
          <Text className="text-2xl font-bold text-center text-purple-900 mb-2">
            Additional Details
          </Text>
          <Text className="text-center text-gray-600 mb-6">
            Optional information (can be added later)
          </Text>

          <Text className="text-gray-700 font-medium mb-2">Gender</Text>
          <View className="flex-row mb-4">
            <Pressable
              onPress={() => updateFormData({ gender: 'male' })}
              className={`flex-1 p-3 rounded-lg mr-2 ${formData.gender === 'male' ? 'bg-blue-100 border-blue-300' : 'bg-gray-100'} border`}
            >
              <Text className={`text-center font-medium ${formData.gender === 'male' ? 'text-blue-800' : 'text-gray-600'}`}>
                Boy
              </Text>
            </Pressable>
            <Pressable
              onPress={() => updateFormData({ gender: 'female' })}
              className={`flex-1 p-3 rounded-lg ml-2 ${formData.gender === 'female' ? 'bg-pink-100 border-pink-300' : 'bg-gray-100'} border`}
            >
              <Text className={`text-center font-medium ${formData.gender === 'female' ? 'text-pink-800' : 'text-gray-600'}`}>
                Girl
              </Text>
            </Pressable>
          </View>

          <Text className="text-gray-700 font-medium mb-2">Birth Weight</Text>
          <View className="flex-row mb-4">
            <TextInput
              value={formData.weightValue}
              onChangeText={(text) => updateFormData({ weightValue: text })}
              placeholder="0.0"
              keyboardType="numeric"
              className="flex-1 bg-gray-50 p-4 rounded-xl mr-2 text-gray-800"
            />
            <View className="flex-row">
              <Pressable
                onPress={() => updateFormData({ weightUnit: 'kg' })}
                className={`px-4 py-4 rounded-l-xl border ${formData.weightUnit === 'kg' ? 'bg-purple-100 border-purple-300' : 'bg-gray-100 border-gray-300'}`}
              >
                <Text className={`font-medium ${formData.weightUnit === 'kg' ? 'text-purple-800' : 'text-gray-600'}`}>
                  kg
                </Text>
              </Pressable>
              <Pressable
                onPress={() => updateFormData({ weightUnit: 'lb' })}
                className={`px-4 py-4 rounded-r-xl border-t border-r border-b ${formData.weightUnit === 'lb' ? 'bg-purple-100 border-purple-300' : 'bg-gray-100 border-gray-300'}`}
              >
                <Text className={`font-medium ${formData.weightUnit === 'lb' ? 'text-purple-800' : 'text-gray-600'}`}>
                  lb
                </Text>
              </Pressable>
            </View>
          </View>

          <Text className="text-gray-700 font-medium mb-2">Birth Length</Text>
          <View className="flex-row mb-6">
            <TextInput
              value={formData.heightValue}
              onChangeText={(text) => updateFormData({ heightValue: text })}
              placeholder="0.0"
              keyboardType="numeric"
              className="flex-1 bg-gray-50 p-4 rounded-xl mr-2 text-gray-800"
            />
            <View className="flex-row">
              <Pressable
                onPress={() => updateFormData({ heightUnit: 'cm' })}
                className={`px-4 py-4 rounded-l-xl border ${formData.heightUnit === 'cm' ? 'bg-purple-100 border-purple-300' : 'bg-gray-100 border-gray-300'}`}
              >
                <Text className={`font-medium ${formData.heightUnit === 'cm' ? 'text-purple-800' : 'text-gray-600'}`}>
                  cm
                </Text>
              </Pressable>
              <Pressable
                onPress={() => updateFormData({ heightUnit: 'in' })}
                className={`px-4 py-4 rounded-r-xl border-t border-r border-b ${formData.heightUnit === 'in' ? 'bg-purple-100 border-purple-300' : 'bg-gray-100 border-gray-300'}`}
              >
                <Text className={`font-medium ${formData.heightUnit === 'in' ? 'text-purple-800' : 'text-gray-600'}`}>
                  in
                </Text>
              </Pressable>
            </View>
          </View>

          <Pressable
            onPress={handleCreateBaby}
            className="bg-purple-600 p-4 rounded-xl mb-3"
            disabled={!canComplete || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text className="text-white font-semibold text-center text-lg">
                Create Profile
              </Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => setStep(1)}
            className="border border-gray-300 p-4 rounded-xl"
            disabled={isLoading}
          >
            <Text className="text-gray-600 font-medium text-center">
              Back
            </Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
});
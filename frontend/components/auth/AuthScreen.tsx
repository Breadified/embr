import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, Alert, ActivityIndicator } from 'react-native';
import { observer } from '@legendapp/state/react';
import { AuthService } from '../../services/authService';
import type { User } from '@supabase/supabase-js';

interface AuthScreenProps {
  onAuthComplete: (user: User) => void;
}

type AuthMode = 'welcome' | 'signin' | 'signup';

export const AuthScreen: React.FC<AuthScreenProps> = observer(({ onAuthComplete }) => {
  const [mode, setMode] = useState<AuthMode>('welcome');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setIsLoading(true);
    try {
      const { user } = await AuthService.signIn(email, password);
      if (user) {
        onAuthComplete(user);
      }
    } catch (error) {
      Alert.alert('Sign In Failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setIsLoading(true);
    try {
      const { user } = await AuthService.signUp(email, password);
      if (user) {
        Alert.alert('Success', 'Account created! Please check your email to verify your account.');
        onAuthComplete(user);
      }
    } catch (error) {
      Alert.alert('Sign Up Failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: 'google' | 'apple' | 'github' | 'facebook') => {
    setIsLoading(true);
    try {
      console.log(`Starting ${provider} OAuth sign-in...`);
      const { url } = await AuthService.signInWithProvider(provider);
      
      if (url) {
        Alert.alert(
          'OAuth Sign In',
          `Please complete sign-in in your browser. You'll be redirected back to the app.`,
          [{ text: 'OK', style: 'default' }]
        );
        // In a real implementation, you'd handle the redirect flow here
      }
    } catch (error) {
      console.error(`${provider} OAuth failed:`, error);
      Alert.alert(
        'OAuth Sign In Failed',
        error instanceof Error ? error.message : 'OAuth sign-in not available',
        [
          { text: 'OK', style: 'default' },
          {
            text: 'Try Guest Mode',
            style: 'default',
            onPress: handleGuestMode
          }
        ]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestMode = async () => {
    setIsLoading(true);
    try {
      console.log('Starting guest mode...');
      const user = await AuthService.initializeDemoAuth();
      console.log('Guest mode user created:', user.id);
      onAuthComplete(user);
    } catch (error) {
      console.error('Guest mode failed:', error);
      Alert.alert(
        'Guest Mode Error',
        'Failed to start guest mode. Please check your connection or try again.',
        [
          { text: 'OK', style: 'default' },
          {
            text: 'Try Again',
            style: 'default',
            onPress: handleGuestMode
          }
        ]
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (mode === 'welcome') {
    return (
      <View className="flex-1 bg-blue-50 justify-center items-center px-6">
        <View className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-sm">
          <Text className="text-3xl font-bold text-center text-blue-900 mb-2">
            BabyTrack
          </Text>
          <Text className="text-center text-gray-600 mb-8">
            Track your baby&apos;s activities with ease
          </Text>

          {/* OAuth Sign-In Options */}
          <View className="mb-6">
            <Text className="text-center text-sm text-gray-500 mb-3">
              Sign in with
            </Text>
            
            <View className="flex-row justify-center space-x-2">
              <Pressable
                onPress={() => handleOAuthSignIn('google')}
                className="bg-red-500 px-4 py-3 rounded-xl flex-1"
                disabled={isLoading}
              >
                <Text className="text-white font-semibold text-center text-sm">
                  Google
                </Text>
              </Pressable>
              
              <Pressable
                onPress={() => handleOAuthSignIn('apple')}
                className="bg-gray-900 px-4 py-3 rounded-xl flex-1"
                disabled={isLoading}
              >
                <Text className="text-white font-semibold text-center text-sm">
                  Apple
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Divider */}
          <View className="flex-row items-center mb-6">
            <View className="flex-1 h-px bg-gray-300" />
            <Text className="px-3 text-xs text-gray-500">OR</Text>
            <View className="flex-1 h-px bg-gray-300" />
          </View>

          {/* Email/Password Options */}
          <Pressable
            onPress={() => setMode('signin')}
            className="bg-blue-600 p-4 rounded-xl mb-3"
            disabled={isLoading}
          >
            <Text className="text-white font-semibold text-center text-lg">
              Sign In with Email
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setMode('signup')}
            className="bg-blue-100 p-4 rounded-xl mb-4"
            disabled={isLoading}
          >
            <Text className="text-blue-600 font-semibold text-center text-lg">
              Create Account
            </Text>
          </Pressable>

          {/* Guest Mode */}
          <Pressable
            onPress={handleGuestMode}
            className="border border-gray-300 p-4 rounded-xl"
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#6B7280" />
            ) : (
              <Text className="text-gray-600 font-medium text-center">
                Continue as Guest
              </Text>
            )}
          </Pressable>

          <Text className="text-xs text-gray-400 text-center mt-4">
            Guest mode data won&apos;t sync across devices
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-blue-50 justify-center items-center px-6">
      <View className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-sm">
        <Text className="text-2xl font-bold text-center text-blue-900 mb-6">
          {mode === 'signin' ? 'Sign In' : 'Create Account'}
        </Text>

        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          keyboardType="email-address"
          autoCapitalize="none"
          className="bg-gray-50 p-4 rounded-xl mb-3 text-gray-800"
          editable={!isLoading}
        />

        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          secureTextEntry
          className="bg-gray-50 p-4 rounded-xl mb-6 text-gray-800"
          editable={!isLoading}
        />

        <Pressable
          onPress={mode === 'signin' ? handleSignIn : handleSignUp}
          className="bg-blue-600 p-4 rounded-xl mb-3"
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text className="text-white font-semibold text-center text-lg">
              {mode === 'signin' ? 'Sign In' : 'Create Account'}
            </Text>
          )}
        </Pressable>

        <Pressable
          onPress={() => setMode('welcome')}
          className="border border-gray-300 p-4 rounded-xl"
          disabled={isLoading}
        >
          <Text className="text-gray-600 font-medium text-center">
            Back
          </Text>
        </Pressable>
      </View>
    </View>
  );
});
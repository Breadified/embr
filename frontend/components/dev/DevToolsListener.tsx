// Development-only component that listens for dev triggers
import { useEffect, useRef } from 'react';
import { Platform, Pressable } from 'react-native';
import * as Linking from 'expo-linking';
import { DeveloperMenu, useDeveloperMenu } from '../DeveloperMenu';

export const DevToolsListener = () => {
  const devMenu = useDeveloperMenu();
  const tapCount = useRef(0);
  const tapTimer = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    if (!__DEV__) return;
    
    // Check URL parameters on web
    if (Platform.OS === 'web') {
      const checkUrlParams = async () => {
        const urlParams = new URLSearchParams(window.location.search);
        
        // Check for seed parameter
        if (urlParams.get('seed') === 'true') {
          console.log('🌱 Seed parameter detected in URL');
          // Remove the parameter from URL to prevent re-triggering
          urlParams.delete('seed');
          urlParams.delete('weeks');
          const newUrl = `${window.location.pathname}${urlParams.toString() ? '?' + urlParams.toString() : ''}`;
          window.history.replaceState({}, '', newUrl);
          
          // Open dev menu instead of directly generating seed data
          setTimeout(() => {
            devMenu.show();
          }, 2000); // Wait for app to initialize
        }
        
        // Check for dev menu trigger
        if (urlParams.get('devmenu') === 'true') {
          console.log('🔧 Dev menu parameter detected');
          urlParams.delete('devmenu');
          const newUrl = `${window.location.pathname}${urlParams.toString() ? '?' + urlParams.toString() : ''}`;
          window.history.replaceState({}, '', newUrl);
          setTimeout(() => devMenu.show(), 1000);
        }
      };
      
      checkUrlParams();
    }
    
    // Handle Expo CLI custom commands (expo start --dev-client)
    const handleInitialUrl = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl && initialUrl.includes('dev-menu')) {
        console.log('🔧 Dev menu trigger detected from initial URL');
        setTimeout(() => {
          devMenu.show();
        }, 2000);
      }
    };
    
    handleInitialUrl();
  }, []);
  
  // Handle triple-tap gesture to open dev menu
  const handleTripleTap = () => {
    tapCount.current += 1;
    
    if (tapTimer.current) {
      clearTimeout(tapTimer.current);
    }
    
    tapTimer.current = setTimeout(() => {
      tapCount.current = 0;
    }, 500); // Reset after 500ms
    
    if (tapCount.current === 3) {
      console.log('🔧 Triple tap detected - opening dev menu');
      devMenu.show();
      tapCount.current = 0;
    }
  };
  
  if (!__DEV__) return null;
  
  return (
    <>
      {/* Invisible tap area in top-right corner for dev menu trigger */}
      <Pressable
        onPress={handleTripleTap}
        style={{
          position: 'absolute',
          top: 50,
          right: 10,
          width: 60,
          height: 60,
          zIndex: 9999,
        }}
      />
      
      {/* Developer Menu Modal */}
      <DeveloperMenu visible={devMenu.visible} onClose={devMenu.hide} />
    </>
  );
};

// Export a helper function for manual triggering
export const triggerDevAction = (action: string, params?: Record<string, unknown>) => {
  if (!__DEV__) {
    console.warn('Dev actions are only available in development mode');
    return;
  }
  
  console.log(`Triggering dev action: ${action}`, params);
};
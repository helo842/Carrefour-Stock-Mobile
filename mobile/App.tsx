import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { isFirebaseConfigured } from './src/config/env';
import { RootNavigator } from './src/navigation/RootNavigator';
import { ConfigErrorScreen } from './src/screens/ConfigErrorScreen';
import { useAuthStore } from './src/store/auth.store';

export default function App() {
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    return initialize();
  }, [initialize]);

  if (!isFirebaseConfigured) {
    return (
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <ConfigErrorScreen />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <RootNavigator />
    </SafeAreaProvider>
  );
}

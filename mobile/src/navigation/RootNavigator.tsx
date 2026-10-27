import { NavigationContainer } from '@react-navigation/native';
import { useAuthStore } from '../store/auth.store';
import { ProfileErrorScreen } from '../screens/ProfileErrorScreen';
import { SplashScreen } from '../screens/SplashScreen';
import { AppTabs } from './AppTabs';
import { AuthNavigator } from './AuthNavigator';
import { navigationTheme } from './theme';

export function RootNavigator() {
  const status = useAuthStore((state) => state.status);

  if (status === 'booting' || status === 'loadingProfile') {
    return <SplashScreen />;
  }

  if (status === 'error') {
    return <ProfileErrorScreen />;
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      {status === 'signedIn' ? <AppTabs /> : <AuthNavigator />}
    </NavigationContainer>
  );
}

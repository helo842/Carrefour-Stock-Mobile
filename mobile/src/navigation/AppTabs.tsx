import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StyleSheet } from 'react-native';
import { useAuthStore } from '../store/auth.store';
import { colors } from '../theme';
import { permissions } from '../utils/roles';
import { AdminNavigator } from './AdminNavigator';
import { DashboardNavigator } from './DashboardNavigator';
import { LowStockNavigator } from './LowStockNavigator';
import { ProductsNavigator } from './ProductsNavigator';
import { ProfileNavigator } from './ProfileNavigator';
import type { AppTabsParamList } from './types';

const Tab = createBottomTabNavigator<AppTabsParamList>();

type IconName = keyof typeof Ionicons.glyphMap;

function tabIcon(name: IconName) {
  function TabBarIcon({ color, size }: { color: string; size: number }) {
    return <Ionicons name={name} size={size} color={color} />;
  }
  TabBarIcon.displayName = `TabBarIcon(${name})`;
  return TabBarIcon;
}

export function AppTabs() {
  const role = useAuthStore((state) => state.profile?.role);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tab.Screen
        name="ProductsTab"
        component={ProductsNavigator}
        options={{ title: 'Productos', tabBarIcon: tabIcon('cube-outline') }}
      />
      <Tab.Screen
        name="DashboardTab"
        component={DashboardNavigator}
        options={{ title: 'Dashboard', tabBarIcon: tabIcon('stats-chart-outline') }}
      />
      {permissions.viewLowStock(role) ? (
        <Tab.Screen
          name="LowStockTab"
          component={LowStockNavigator}
          options={{ title: 'Stock bajo', tabBarIcon: tabIcon('alert-circle-outline') }}
        />
      ) : null}
      {permissions.manageStock(role) ? (
        <Tab.Screen
          name="AdminTab"
          component={AdminNavigator}
          options={{ title: 'Admin', tabBarIcon: tabIcon('settings-outline') }}
        />
      ) : null}
      <Tab.Screen
        name="ProfileTab"
        component={ProfileNavigator}
        options={{ title: 'Perfil', tabBarIcon: tabIcon('person-outline') }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    paddingTop: 6,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
});

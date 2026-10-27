import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AdminHomeScreen } from '../screens/AdminHomeScreen';
import { StockManagementScreen } from '../screens/StockManagementScreen';
import { UserManagementScreen } from '../screens/UserManagementScreen';
import { stackScreenOptions } from './theme';
import type { AdminStackParamList } from './types';

const Stack = createNativeStackNavigator<AdminStackParamList>();

export function AdminNavigator() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen
        name="AdminHome"
        component={AdminHomeScreen}
        options={{ title: 'Administración' }}
      />
      <Stack.Screen
        name="StockManagement"
        component={StockManagementScreen}
        options={{ title: 'Gestión de stock' }}
      />
      <Stack.Screen
        name="UserManagement"
        component={UserManagementScreen}
        options={{ title: 'Usuarios' }}
      />
    </Stack.Navigator>
  );
}

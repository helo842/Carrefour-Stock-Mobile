import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LowStockScreen } from '../screens/LowStockScreen';
import { ProductDetailScreen } from '../screens/ProductDetailScreen';
import { stackScreenOptions } from './theme';
import type { LowStockStackParamList } from './types';

const Stack = createNativeStackNavigator<LowStockStackParamList>();

export function LowStockNavigator() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen
        name="LowStock"
        component={LowStockScreen}
        options={{ title: 'Stock bajo' }}
      />
      <Stack.Screen
        name="ProductDetail"
        component={ProductDetailScreen}
        options={{ title: 'Detalle del producto' }}
      />
    </Stack.Navigator>
  );
}

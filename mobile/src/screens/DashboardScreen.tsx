import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback } from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';
import { ProductCard } from '../components/ProductCard';
import { Screen } from '../components/Screen';
import { SectionHeader } from '../components/SectionHeader';
import { EmptyState, ErrorState, LoadingState } from '../components/StateViews';
import { StatCard } from '../components/StatCard';
import type { AppTabsParamList } from '../navigation/types';
import { useAuthStore } from '../store/auth.store';
import { useDashboardStore } from '../store/dashboard.store';
import { colors, fontSize, spacing } from '../theme';
import { formatQuantity } from '../utils/format';
import { permissions, roleLabels } from '../utils/roles';

export function DashboardScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<AppTabsParamList>>();
  const profile = useAuthStore((state) => state.profile);
  const data = useDashboardStore((state) => state.data);
  const loading = useDashboardStore((state) => state.loading);
  const error = useDashboardStore((state) => state.error);
  const load = useDashboardStore((state) => state.load);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const openProduct = (barcode: string) => {
    navigation.navigate('ProductsTab', {
      screen: 'ProductDetail',
      params: { barcode },
    });
  };

  if (loading && !data) {
    return <LoadingState message="Calculando el estado del stock…" />;
  }

  if (error && !data) {
    return (
      <ErrorState
        message={error}
        onRetry={() => {
          void load();
        }}
      />
    );
  }

  if (!data) return null;

  const { summary, topViewed, lowStock } = data;
  const canSeeLowStock = permissions.viewLowStock(profile?.role);

  return (
    <Screen
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={() => {
            void load();
          }}
          colors={[colors.brand]}
          tintColor={colors.brand}
        />
      }
    >
      <View style={styles.headerBlock}>
        <Text style={styles.greeting}>Hola, {profile?.name.split(' ')[0] ?? 'equipo'}</Text>
        <Text style={styles.subtitle}>
          {profile ? roleLabels[profile.role] : ''} · Resumen de stock en tiempo real
        </Text>
      </View>

      <View style={styles.statsGrid}>
        <StatCard
          label="Productos"
          value={formatQuantity(summary.totalProducts)}
          hint="Con seguimiento de stock"
        />
        <StatCard
          label="Unidades"
          value={formatQuantity(summary.totalUnits)}
          hint="Totales en tienda"
        />
        <StatCard
          label="Stock bajo"
          value={formatQuantity(summary.lowStockCount)}
          hint={`Umbral ≤ ${summary.lowStockThreshold} uds.`}
          tone={summary.lowStockCount > 0 ? 'warning' : 'success'}
        />
        <StatCard
          label="Sin stock"
          value={formatQuantity(summary.outOfStockCount)}
          hint="Requieren reposición"
          tone={summary.outOfStockCount > 0 ? 'danger' : 'success'}
        />
      </View>

      {canSeeLowStock ? (
        <View style={styles.section}>
          <SectionHeader
            title="Prioridad de reposición"
            actionLabel={lowStock && lowStock.length > 0 ? 'Ver todo' : undefined}
            onAction={
              lowStock && lowStock.length > 0
                ? () => navigation.navigate('LowStockTab', { screen: 'LowStock' })
                : undefined
            }
          />
          {lowStock && lowStock.length > 0 ? (
            <View style={styles.list}>
              {lowStock.map((product) => (
                <ProductCard key={product.barcode} product={product} onPress={openProduct} />
              ))}
            </View>
          ) : (
            <View style={styles.positiveCard}>
              <Text style={styles.positiveTitle}>Todo el stock está por encima del umbral</Text>
              <Text style={styles.positiveText}>
                No hay productos con {summary.lowStockThreshold} unidades o menos.
              </Text>
            </View>
          )}
        </View>
      ) : null}

      <View style={styles.section}>
        <SectionHeader title="Más consultados" />
        {topViewed.length > 0 ? (
          <View style={styles.list}>
            {topViewed.map((product) => (
              <ProductCard key={product.barcode} product={product} onPress={openProduct} />
            ))}
          </View>
        ) : (
          <EmptyState
            icon="eye-outline"
            title="Sin consultas todavía"
            message="Cuando el equipo consulte productos aparecerán aquí."
          />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerBlock: {
    gap: spacing.xs,
  },
  greeting: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  section: {
    gap: spacing.sm,
  },
  list: {
    gap: spacing.sm,
  },
  positiveCard: {
    backgroundColor: colors.successSoft,
    borderRadius: spacing.md,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  positiveTitle: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.success,
  },
  positiveText: {
    fontSize: fontSize.xs,
    color: colors.success,
  },
});

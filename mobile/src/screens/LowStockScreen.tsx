import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { getErrorMessage } from '../api/errors';
import { fetchLowStock } from '../api/stock';
import { ProductCard } from '../components/ProductCard';
import { EmptyState, ErrorState, LoadingState } from '../components/StateViews';
import type { LowStockStackParamList } from '../navigation/types';
import { colors, fontSize, radius, spacing } from '../theme';
import type { ProductWithStock } from '../types/api';

type Props = NativeStackScreenProps<LowStockStackParamList, 'LowStock'>;

const THRESHOLDS = [5, 10, 20] as const;

export function LowStockScreen({ navigation }: Props) {
  const [items, setItems] = useState<ProductWithStock[]>([]);
  const [selectedThreshold, setSelectedThreshold] = useState<number | null>(null);
  const [effectiveThreshold, setEffectiveThreshold] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await fetchLowStock({
        limit: 50,
        ...(selectedThreshold !== null ? { threshold: selectedThreshold } : {}),
      });
      setItems(result.items);
      setEffectiveThreshold(result.threshold);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [selectedThreshold]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (loading && items.length === 0) {
    return <LoadingState message="Buscando productos con stock bajo…" />;
  }

  if (error && items.length === 0) {
    return (
      <ErrorState
        message={error}
        onRetry={() => {
          void load();
        }}
      />
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={items}
      keyExtractor={(item) => item.barcode}
      contentContainerStyle={styles.listContent}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
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
      renderItem={({ item }) => (
        <ProductCard
          product={item}
          onPress={(barcode) => navigation.navigate('ProductDetail', { barcode })}
        />
      )}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.title}>Reponer cuanto antes</Text>
          <Text style={styles.subtitle}>
            Productos con {effectiveThreshold ?? selectedThreshold ?? 10} unidades o menos.
            Ordenados de menor a mayor stock.
          </Text>
          <View style={styles.chipsRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: selectedThreshold === null }}
              onPress={() => setSelectedThreshold(null)}
              style={[styles.chip, selectedThreshold === null && styles.chipSelected]}
            >
              <Text
                style={[styles.chipText, selectedThreshold === null && styles.chipTextSelected]}
              >
                Predeterminado
              </Text>
            </Pressable>
            {THRESHOLDS.map((value) => {
              const selected = selectedThreshold === value;
              return (
                <Pressable
                  key={value}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => setSelectedThreshold(value)}
                  style={[styles.chip, selected && styles.chipSelected]}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    ≤ {value}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      }
      ListEmptyComponent={
        <EmptyState
          icon="checkmark-circle-outline"
          title="Sin alertas de stock"
          message="Ningún producto está por debajo del umbral seleccionado."
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    flexGrow: 1,
  },
  header: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    lineHeight: 20,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  chip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
  chipSelected: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  chipText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.textMuted,
  },
  chipTextSelected: {
    color: colors.textInverse,
  },
  separator: {
    height: spacing.sm,
  },
});

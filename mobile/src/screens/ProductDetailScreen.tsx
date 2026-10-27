import { Ionicons } from '@expo/vector-icons';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Image } from 'expo-image';
import { useCallback, useEffect, useState } from 'react';
import {
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { fetchProduct } from '../api/products';
import { getErrorMessage } from '../api/errors';
import { AppButton } from '../components/AppButton';
import { Screen } from '../components/Screen';
import { StockBadge } from '../components/StockBadge';
import { ErrorState, LoadingState } from '../components/StateViews';
import type { AppTabsParamList } from '../navigation/types';
import { useAuthStore } from '../store/auth.store';
import { colors, fontSize, radius, spacing } from '../theme';
import type { ProductWithStock } from '../types/api';
import { formatDateTime, formatQuantity } from '../utils/format';
import { permissions } from '../utils/roles';

type DetailRoute = RouteProp<{ ProductDetail: { barcode: string } }, 'ProductDetail'>;

export function ProductDetailScreen() {
  const route = useRoute<DetailRoute>();
  const navigation = useNavigation<BottomTabNavigationProp<AppTabsParamList>>();
  const role = useAuthStore((state) => state.profile?.role);

  const { barcode } = route.params;
  const [product, setProduct] = useState<ProductWithStock | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setProduct(await fetchProduct(barcode));
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [barcode]);

  useEffect(() => {
    // Initial fetch: showing the spinner synchronously is intentional here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  if (loading && !product) {
    return <LoadingState message="Cargando producto…" />;
  }

  if (error && !product) {
    return (
      <ErrorState
        message={error}
        onRetry={() => {
          void load();
        }}
      />
    );
  }

  if (!product) return null;

  const quantity = product.stock?.quantity ?? 0;

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
      <View style={styles.imageCard}>
        {product.imageUrl ? (
          <Image
            source={{ uri: product.imageUrl }}
            style={styles.image}
            contentFit="contain"
            transition={200}
            accessibilityLabel={`Imagen de ${product.name}`}
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="cube-outline" size={48} color={colors.textMuted} />
            <Text style={styles.imagePlaceholderText}>Sin imagen disponible</Text>
          </View>
        )}
      </View>

      <View style={styles.titleBlock}>
        <Text style={styles.name}>{product.name}</Text>
        <View style={styles.chipsRow}>
          {product.brand ? <Text style={styles.chip}>{product.brand}</Text> : null}
          {product.category ? <Text style={styles.chip}>{product.category}</Text> : null}
          {product.quantityLabel ? <Text style={styles.chip}>{product.quantityLabel}</Text> : null}
        </View>
      </View>

      <View style={styles.stockCard}>
        <View style={styles.stockHeader}>
          <Text style={styles.stockLabel}>Stock disponible</Text>
          <StockBadge quantity={quantity} />
        </View>
        <Text style={styles.stockValue}>{formatQuantity(quantity)}</Text>
        <Text style={styles.stockUpdated}>
          Actualizado: {formatDateTime(product.stock?.updatedAt ?? null)}
        </Text>
        {quantity === 0 ? (
          <Text style={styles.stockAlert}>Producto sin unidades disponibles.</Text>
        ) : null}
      </View>

      {permissions.manageStock(role) ? (
        <AppButton
          label="Editar stock de este producto"
          icon="create-outline"
          variant="secondary"
          onPress={() =>
            navigation.navigate('AdminTab', {
              screen: 'StockManagement',
              params: { barcode },
            })
          }
        />
      ) : null}

      <View style={styles.infoCard}>
        <InfoRow label="Marca" value={product.brand ?? 'No disponible'} />
        <InfoRow label="Categoría" value={product.category ?? 'No disponible'} />
        <InfoRow label="Formato" value={product.quantityLabel ?? 'No disponible'} />
        <InfoRow label="Código de barras" value={product.barcode} mono />
      </View>

      <Text style={styles.source}>
        Información de producto: OpenFoodFacts. Stock: Carrefour Stock.
      </Text>
    </Screen>
  );
}

function InfoRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, mono && styles.monoValue]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  imageCard: {
    height: 200,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  imagePlaceholderText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  titleBlock: {
    gap: spacing.sm,
  },
  name: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.text,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    backgroundColor: colors.infoSoft,
    color: colors.brand,
    fontSize: fontSize.xs,
    fontWeight: '600',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  stockCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  stockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stockLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  stockValue: {
    fontSize: fontSize.display,
    fontWeight: '800',
    color: colors.text,
  },
  stockUpdated: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  stockAlert: {
    marginTop: spacing.sm,
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.danger,
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.lg,
    paddingVertical: spacing.sm + 2,
  },
  infoLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  infoValue: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: '500',
    flexShrink: 1,
    textAlign: 'right',
  },
  monoValue: {
    fontVariant: ['tabular-nums'],
  },
  source: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});

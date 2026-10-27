import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, radius, spacing } from '../theme';
import type { ProductWithStock } from '../types/api';
import { StockBadge } from './StockBadge';

interface ProductCardProps {
  product: ProductWithStock;
  onPress?: (barcode: string) => void;
}

export const ProductCard = memo(function ProductCard({
  product,
  onPress,
}: ProductCardProps) {
  const quantity = product.stock?.quantity ?? 0;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${product.name}. Stock: ${quantity} unidades`}
      disabled={!onPress}
      onPress={() => onPress?.(product.barcode)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.imageWrapper}>
        {product.imageUrl ? (
          <Image
            source={{ uri: product.imageUrl }}
            style={styles.image}
            contentFit="contain"
            transition={150}
            accessibilityLabel={`Imagen de ${product.name}`}
          />
        ) : (
          <Ionicons name="cube-outline" size={28} color={colors.textMuted} />
        )}
      </View>

      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {[product.brand, product.category].filter(Boolean).join(' · ') || 'Sin marca'}
        </Text>
        <Text style={styles.barcode}>{product.barcode}</Text>
        <StockBadge quantity={quantity} />
      </View>

      {onPress ? (
        <Ionicons name="chevron-forward" size={20} color={colors.borderStrong} />
      ) : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
  imageWrapper: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  content: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  meta: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  barcode: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
    marginBottom: spacing.xs,
  },
});

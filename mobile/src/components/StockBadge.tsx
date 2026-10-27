import { StyleSheet, Text, View } from 'react-native';
import { colors, DEFAULT_LOW_STOCK_THRESHOLD, fontSize, radius, spacing } from '../theme';
import { formatQuantity } from '../utils/format';

interface StockBadgeProps {
  quantity: number;
  threshold?: number;
  suffix?: boolean;
}

export function StockBadge({
  quantity,
  threshold = DEFAULT_LOW_STOCK_THRESHOLD,
  suffix = true,
}: StockBadgeProps) {
  const tone =
    quantity <= 0
      ? { background: colors.dangerSoft, text: colors.danger }
      : quantity <= threshold
        ? { background: colors.warningSoft, text: colors.warning }
        : { background: colors.successSoft, text: colors.success };

  const label =
    quantity <= 0
      ? 'Sin stock'
      : `${formatQuantity(quantity)}${suffix ? ' uds.' : ''}`;

  return (
    <View
      style={[styles.badge, { backgroundColor: tone.background }]}
      accessibilityLabel={`Stock: ${label}`}
    >
      <Text style={[styles.label, { color: tone.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
});

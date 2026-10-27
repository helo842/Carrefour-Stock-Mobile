import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, radius, spacing } from '../theme';

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  tone?: 'default' | 'warning' | 'danger' | 'success';
}

const tones = {
  default: { valueColor: colors.brand, background: colors.surface },
  warning: { valueColor: colors.warning, background: colors.warningSoft },
  danger: { valueColor: colors.danger, background: colors.dangerSoft },
  success: { valueColor: colors.success, background: colors.successSoft },
} as const;

export function StatCard({ label, value, hint, tone = 'default' }: StatCardProps) {
  const palette = tones[tone];

  return (
    <View style={[styles.card, { backgroundColor: palette.background }]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color: palette.valueColor }]}>{value}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 140,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  label: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  value: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
  },
  hint: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
});

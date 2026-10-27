import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, radius, spacing } from '../theme';
import type { Role } from '../types/api';
import { roleLabels } from '../utils/roles';

const palette: Record<Role, { background: string; text: string }> = {
  employee: { background: colors.infoSoft, text: colors.brand },
  supervisor: { background: colors.warningSoft, text: colors.warning },
  admin: { background: colors.dangerSoft, text: colors.danger },
};

export function RoleBadge({ role }: { role: Role }) {
  const tone = palette[role];

  return (
    <View style={[styles.badge, { backgroundColor: tone.background }]}>
      <Text style={[styles.label, { color: tone.text }]}>{roleLabels[role]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
});

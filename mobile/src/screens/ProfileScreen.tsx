import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../components/AppButton';
import { RoleBadge } from '../components/RoleBadge';
import { Screen } from '../components/Screen';
import { SectionHeader } from '../components/SectionHeader';
import { env } from '../config/env';
import { useAuthStore } from '../store/auth.store';
import { colors, fontSize, radius, spacing } from '../theme';
import { initials } from '../utils/format';
import { roleLabels } from '../utils/roles';

const version = Constants.expoConfig?.version ?? '1.0.0';

export function ProfileScreen() {
  const profile = useAuthStore((state) => state.profile);
  const signOut = useAuthStore((state) => state.signOut);

  if (!profile) return null;

  const confirmSignOut = () => {
    Alert.alert('Cerrar sesión', '¿Quieres salir de Carrefour Stock Mobile?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar sesión',
        style: 'destructive',
        onPress: () => {
          void signOut();
        },
      },
    ]);
  };

  return (
    <Screen>
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(profile.name)}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.name}>{profile.name}</Text>
          <Text style={styles.email}>{profile.email}</Text>
          <RoleBadge role={profile.role} />
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Permisos de tu rol" />
        <View style={styles.list}>
          <PermissionRow label="Consultar productos y stock" granted />
          <PermissionRow
            label="Ver productos con stock bajo"
            granted={profile.role !== 'employee'}
          />
          <PermissionRow
            label="Modificar stock y gestionar usuarios"
            granted={profile.role === 'admin'}
          />
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Sesión" />
        <View style={styles.list}>
          <InfoRow label="Rol" value={roleLabels[profile.role]} />
          <InfoRow label="Identificador" value={profile.uid} />
          <InfoRow label="API" value={env.apiUrl} />
          <InfoRow label="Versión" value={version} />
        </View>
      </View>

      <AppButton
        label="Cerrar sesión"
        variant="danger"
        icon="log-out-outline"
        onPress={confirmSignOut}
      />
    </Screen>
  );
}

function PermissionRow({ label, granted }: { label: string; granted: boolean }) {
  return (
    <View style={styles.row}>
      <Ionicons
        name={granted ? 'checkmark-circle' : 'close-circle-outline'}
        size={20}
        color={granted ? colors.success : colors.textMuted}
      />
      <Text style={[styles.rowLabel, !granted && styles.rowMuted]}>{label}</Text>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1} ellipsizeMode="middle">
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  profileCard: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.textInverse,
    fontSize: fontSize.xl,
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  name: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  email: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  section: {
    gap: spacing.sm,
  },
  list: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  rowLabel: {
    fontSize: fontSize.sm,
    color: colors.text,
    flex: 1,
  },
  rowMuted: {
    color: colors.textMuted,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.lg,
    paddingVertical: spacing.sm,
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
});

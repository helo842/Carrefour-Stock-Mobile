import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { getErrorMessage } from '../api/errors';
import { fetchUsers, updateUserRole } from '../api/users';
import { RoleBadge } from '../components/RoleBadge';
import { EmptyState, ErrorState, LoadingState } from '../components/StateViews';
import { useAuthStore } from '../store/auth.store';
import { colors, fontSize, radius, spacing } from '../theme';
import type { Role, UserProfile } from '../types/api';
import { initials } from '../utils/format';
import { roleLabels, ROLES_FOR_PICKER } from '../utils/roles';

export function UserManagementScreen() {
  const currentUser = useAuthStore((state) => state.profile);

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<UserProfile | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setUsers(await fetchUsers());
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial fetch with an immediate loading state (no derived state involved).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const changeRole = async (role: Role) => {
    if (!selected) return;

    setSaving(true);
    try {
      const updated = await updateUserRole(selected.uid, role);
      setUsers((current) =>
        current.map((user) => (user.uid === updated.uid ? updated : user)),
      );
      setSelected(null);
    } catch (updateError) {
      Alert.alert('No se pudo cambiar el rol', getErrorMessage(updateError));
    } finally {
      setSaving(false);
    }
  };

  if (loading && users.length === 0) {
    return <LoadingState message="Cargando usuarios…" />;
  }

  if (error && users.length === 0) {
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
    <>
      <FlatList
        style={styles.container}
        data={users}
        keyExtractor={(item) => item.uid}
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
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>{users.length} personas con acceso</Text>
            <Text style={styles.subtitle}>
              Toca una persona para cambiar su rol. Los cambios son efectivos de inmediato.
            </Text>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="people-outline"
            title="Sin usuarios"
            message="Todavía no hay perfiles provisionados en la aplicación."
          />
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${item.name}, ${roleLabels[item.role]}. Cambiar rol.`}
            onPress={() => setSelected(item)}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials(item.name)}</Text>
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.name}>
                {item.name}
                {item.uid === currentUser?.uid ? ' (tú)' : ''}
              </Text>
              <Text style={styles.email} numberOfLines={1}>
                {item.email}
              </Text>
              <RoleBadge role={item.role} />
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.borderStrong} />
          </Pressable>
        )}
      />

      <Modal
        visible={selected !== null}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!saving) setSelected(null);
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Cambiar rol</Text>
            <Text style={styles.modalSubtitle}>
              {selected?.name} · {selected?.email}
            </Text>

            {ROLES_FOR_PICKER.map((role) => {
              const isCurrent = selected?.role === role;
              return (
                <Pressable
                  key={role}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isCurrent, disabled: saving }}
                  disabled={saving || isCurrent}
                  onPress={() => void changeRole(role)}
                  style={[styles.option, isCurrent && styles.optionCurrent]}
                >
                  <View style={styles.optionContent}>
                    <Text style={styles.optionLabel}>{roleLabels[role]}</Text>
                    <Text style={styles.optionHint}>
                      {role === 'employee'
                        ? 'Consulta de productos y stock.'
                        : role === 'supervisor'
                          ? 'Además, alertas de stock bajo.'
                          : 'Además, modifica stock y gestiona usuarios.'}
                    </Text>
                  </View>
                  {saving && !isCurrent ? (
                    <ActivityIndicator size="small" color={colors.brand} />
                  ) : isCurrent ? (
                    <Ionicons name="checkmark-circle" size={22} color={colors.success} />
                  ) : (
                    <Ionicons name="chevron-forward" size={20} color={colors.borderStrong} />
                  )}
                </Pressable>
              );
            })}

            <Pressable
              accessibilityRole="button"
              disabled={saving}
              onPress={() => setSelected(null)}
              style={styles.cancelButton}
            >
              <Text style={styles.cancelLabel}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
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
    gap: spacing.xs,
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
  separator: {
    height: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  rowPressed: {
    opacity: 0.85,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.infoSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.brand,
  },
  rowContent: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  email: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  modalSubtitle: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  optionCurrent: {
    borderColor: colors.success,
    backgroundColor: colors.successSoft,
  },
  optionContent: {
    flex: 1,
    gap: 2,
  },
  optionLabel: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  optionHint: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.xs,
  },
  cancelLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textMuted,
  },
});

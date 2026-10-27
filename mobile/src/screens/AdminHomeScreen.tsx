import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../components/Screen';
import { ErrorState } from '../components/StateViews';
import type { AdminStackParamList } from '../navigation/types';
import { useAuthStore } from '../store/auth.store';
import { colors, fontSize, radius, spacing } from '../theme';
import { permissions } from '../utils/roles';

type Props = NativeStackScreenProps<AdminStackParamList, 'AdminHome'>;

export function AdminHomeScreen({ navigation }: Props) {
  const role = useAuthStore((state) => state.profile?.role);

  if (!permissions.manageStock(role)) {
    return (
      <ErrorState
        title="Acceso restringido"
        message="Esta sección solo está disponible para administradores."
      />
    );
  }

  return (
    <Screen>
      <View style={styles.intro}>
        <Text style={styles.title}>Herramientas de administración</Text>
        <Text style={styles.subtitle}>
          Los cambios de stock quedan registrados con tu usuario y son visibles para todo el
          equipo.
        </Text>
      </View>

      <AdminAction
        icon="cube-outline"
        title="Gestión de stock"
        description="Busca un producto por código de barras y actualiza sus unidades."
        onPress={() => navigation.navigate('StockManagement')}
      />

      <AdminAction
        icon="people-outline"
        title="Gestión de usuarios"
        description="Consulta el equipo y asigna roles de empleado, supervisor o administrador."
        onPress={() => navigation.navigate('UserManagement')}
      />

      <View style={styles.note}>
        <Ionicons name="information-circle-outline" size={20} color={colors.brand} />
        <Text style={styles.noteText}>
          Las altas de nuevas cuentas se realizan desde el backoffice mediante la API de
          administración. Pide al equipo técnico que provisione el acceso.
        </Text>
      </View>
    </Screen>
  );
}

function AdminAction({
  icon,
  title,
  description,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={24} color={colors.brand} />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardDescription}>{description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.borderStrong} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  intro: {
    gap: spacing.xs,
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
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  cardPressed: {
    opacity: 0.85,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.infoSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
  },
  cardDescription: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    lineHeight: 18,
  },
  note: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.infoSoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  noteText: {
    flex: 1,
    fontSize: fontSize.xs,
    color: colors.brand,
    lineHeight: 18,
  },
});

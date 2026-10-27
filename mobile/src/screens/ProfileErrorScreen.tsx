import { SafeAreaView, StyleSheet, View } from 'react-native';
import { AppButton } from '../components/AppButton';
import { ErrorState } from '../components/StateViews';
import { useAuthStore } from '../store/auth.store';
import { colors, spacing } from '../theme';

export function ProfileErrorScreen() {
  const { error, retryProfile, signOut } = useAuthStore();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <ErrorState
          title="No se pudo cargar tu perfil"
          message={
            error ??
            'Puede ser un problema de conexión. Revisa tu red e inténtalo de nuevo.'
          }
          onRetry={() => {
            void retryProfile();
          }}
        />
        <AppButton label="Cerrar sesión" variant="ghost" onPress={() => void signOut()} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.lg,
  },
});

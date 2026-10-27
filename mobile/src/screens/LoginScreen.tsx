import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppButton } from '../components/AppButton';
import { AppTextInput } from '../components/AppTextInput';
import { useAuthStore } from '../store/auth.store';
import { colors, fontSize, radius, spacing } from '../theme';

export function LoginScreen() {
  const signIn = useAuthStore((state) => state.signIn);
  const signingIn = useAuthStore((state) => state.signingIn);
  const authError = useAuthStore((state) => state.error);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const submit = () => {
    const normalizedEmail = email.trim();

    if (!normalizedEmail.includes('@')) {
      setLocalError('Introduce un correo electrónico válido.');
      return;
    }
    if (password.length < 6) {
      setLocalError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setLocalError(null);
    void signIn(normalizedEmail, password);
  };

  const error = localError ?? authError;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <View style={styles.hero}>
            <View style={styles.logo}>
              <Text style={styles.logoLetter}>C</Text>
            </View>
            <Text style={styles.brand}>Carrefour</Text>
            <Text style={styles.brandSubtitle}>Stock Mobile</Text>
            <Text style={styles.tagline}>
              Consulta de productos y stock para el equipo de tienda.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>Acceso empleados</Text>
            <Text style={styles.subtitle}>Inicia sesión con tu cuenta corporativa.</Text>

            <AppTextInput
              label="Correo electrónico"
              value={email}
              onChangeText={setEmail}
              placeholder="nombre@carrefour.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              editable={!signingIn}
              returnKeyType="next"
            />

            <AppTextInput
              label="Contraseña"
              value={password}
              onChangeText={setPassword}
              placeholder="Tu contraseña"
              secureTextEntry
              autoComplete="password"
              textContentType="password"
              editable={!signingIn}
              returnKeyType="go"
              onSubmitEditing={submit}
            />

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color={colors.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <AppButton
              label="Iniciar sesión"
              icon="log-in-outline"
              loading={signingIn}
              onPress={submit}
            />

            <Text style={styles.footnote}>
              ¿No tienes acceso? Solicítalo a un administrador de tu tienda.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.brand,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    backgroundColor: colors.brand,
  },
  hero: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  logo: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.textInverse,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  logoLetter: {
    fontSize: 30,
    fontWeight: '800',
    color: colors.brand,
  },
  brand: {
    fontSize: fontSize.display,
    fontWeight: '800',
    color: colors.textInverse,
  },
  brandSubtitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.textInverse,
    opacity: 0.92,
  },
  tagline: {
    marginTop: spacing.sm,
    fontSize: fontSize.sm,
    color: colors.textInverse,
    opacity: 0.8,
    maxWidth: 320,
    lineHeight: 20,
  },
  card: {
    flex: 1,
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    paddingTop: spacing.xl,
    gap: spacing.md,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  errorText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.danger,
  },
  footnote: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: spacing.xs,
  },
});

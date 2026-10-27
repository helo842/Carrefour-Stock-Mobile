import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { env } from '../config/env';
import { colors, fontSize, radius, spacing } from '../theme';

const REQUIRED_VARIABLES = [
  'EXPO_PUBLIC_FIREBASE_API_KEY',
  'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  'EXPO_PUBLIC_FIREBASE_APP_ID',
  'EXPO_PUBLIC_API_URL',
];

export function ConfigErrorScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.iconCircle}>
          <Ionicons name="construct-outline" size={30} color={colors.brand} />
        </View>
        <Text style={styles.title}>Falta configurar la aplicación</Text>
        <Text style={styles.message}>
          Crea un archivo <Text style={styles.code}>.env</Text> en la raíz de{' '}
          <Text style={styles.code}>mobile/</Text> con estas variables y reinicia Expo con{' '}
          <Text style={styles.code}>npx expo start -c</Text>.
        </Text>

        <View style={styles.list}>
          {REQUIRED_VARIABLES.map((name) => (
            <Text key={name} style={styles.variable}>
              {name}
            </Text>
          ))}
        </View>

        <Text style={styles.footnote}>
          Usa la configuración web de tu proyecto Firebase (Configuración del proyecto → Tus
          apps). La API actual es {env.apiUrl}.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.xl,
    paddingTop: spacing.xxl,
    alignItems: 'center',
    gap: spacing.md,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.infoSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  message: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 21,
  },
  code: {
    fontFamily: 'monospace',
    color: colors.text,
  },
  list: {
    alignSelf: 'stretch',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  variable: {
    fontFamily: 'monospace',
    fontSize: fontSize.xs,
    color: colors.brand,
  },
  footnote: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});

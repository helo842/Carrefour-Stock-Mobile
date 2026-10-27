import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, spacing } from '../theme';

export function SplashScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.logo}>
        <Text style={styles.logoLetter}>C</Text>
      </View>
      <Text style={styles.brand}>Carrefour</Text>
      <Text style={styles.title}>Stock Mobile</Text>
      <ActivityIndicator color={colors.textInverse} style={styles.spinner} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: colors.textInverse,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  logoLetter: {
    fontSize: 40,
    fontWeight: '800',
    color: colors.brand,
  },
  brand: {
    fontSize: fontSize.display,
    fontWeight: '800',
    color: colors.textInverse,
    letterSpacing: 0.5,
  },
  title: {
    fontSize: fontSize.lg,
    color: colors.textInverse,
    opacity: 0.9,
  },
  spinner: {
    marginTop: spacing.xl,
  },
});

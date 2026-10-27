import { DefaultTheme, type Theme } from '@react-navigation/native';
import { colors } from '../theme';

export const navigationTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.brand,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    notification: colors.accent,
  },
};

export const stackScreenOptions = {
  headerStyle: { backgroundColor: colors.brand },
  headerTintColor: colors.textInverse,
  headerTitleStyle: { fontWeight: '700' as const },
  headerShadowVisible: false,
  contentStyle: { backgroundColor: colors.background },
};

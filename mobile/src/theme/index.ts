export const colors = {
  brand: '#004E9E',
  brandDark: '#003A75',
  accent: '#E30613',
  background: '#F4F6F9',
  surface: '#FFFFFF',
  text: '#111827',
  textMuted: '#6B7280',
  textInverse: '#FFFFFF',
  border: '#E5E7EB',
  borderStrong: '#D1D5DB',
  success: '#15803D',
  successSoft: '#DCFCE7',
  warning: '#B45309',
  warningSoft: '#FEF3C7',
  danger: '#B91C1C',
  dangerSoft: '#FEE2E2',
  infoSoft: '#DBEAFE',
  disabled: '#9CA3AF',
  overlay: 'rgba(17, 24, 39, 0.45)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
  display: 34,
} as const;

/** Mirrors the backend LOW_STOCK_THRESHOLD default for badge colouring. */
export const DEFAULT_LOW_STOCK_THRESHOLD = 10;

import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { getErrorMessage } from '../api/errors';
import { fetchProduct } from '../api/products';
import { updateStock } from '../api/stock';
import { AppButton } from '../components/AppButton';
import { AppTextInput } from '../components/AppTextInput';
import { ProductCard } from '../components/ProductCard';
import { Screen } from '../components/Screen';
import { StockBadge } from '../components/StockBadge';
import type { AdminStackParamList } from '../navigation/types';
import { colors, fontSize, radius, spacing } from '../theme';
import type { ProductWithStock } from '../types/api';
import { formatDateTime, formatQuantity } from '../utils/format';

type Props = NativeStackScreenProps<AdminStackParamList, 'StockManagement'>;

export function StockManagementScreen({ route }: Props) {
  const initialBarcode = route.params?.barcode ?? '';

  const [barcode, setBarcode] = useState(initialBarcode);
  const [product, setProduct] = useState<ProductWithStock | null>(null);
  const [quantity, setQuantity] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadProduct = useCallback(async (code: string) => {
    const trimmed = code.trim();

    if (!/^\d{8,14}$/.test(trimmed)) {
      setProduct(null);
      setError('Introduce un código de barras válido (entre 8 y 14 dígitos).');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await fetchProduct(trimmed);
      setProduct(result);
      setQuantity(String(result.stock?.quantity ?? 0));
    } catch (loadError) {
      setProduct(null);
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialBarcode) return;
    // Prefill from navigation params; the spinner is intentionally immediate.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadProduct(initialBarcode);
  }, [initialBarcode, loadProduct]);

  const setQuantityValue = (value: number) => {
    setQuantity(String(Math.max(0, value)));
    setSuccess(null);
  };

  const save = async () => {
    if (!product) return;

    if (quantity.trim().length === 0) {
      setError('Introduce la nueva cantidad de stock.');
      return;
    }

    const value = Number(quantity);
    if (!Number.isInteger(value) || value < 0) {
      setError('La cantidad debe ser un número entero mayor o igual que cero.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const stock = await updateStock(product.barcode, value);
      setProduct({ ...product, stock });
      setQuantity(String(stock.quantity));
      setSuccess(`Stock actualizado a ${formatQuantity(stock.quantity)} unidades.`);
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      <Screen>
        <View style={styles.searchCard}>
          <Text style={styles.sectionTitle}>Buscar producto</Text>
          <AppTextInput
            label="Código de barras"
            value={barcode}
            onChangeText={(value) => {
              setBarcode(value.replace(/\D/g, ''));
              setSuccess(null);
            }}
            placeholder="Ej. 3560070976453"
            keyboardType="number-pad"
            maxLength={14}
            editable={!loading}
            returnKeyType="search"
            onSubmitEditing={() => void loadProduct(barcode)}
          />
          <AppButton
            label="Buscar"
            icon="search"
            variant="secondary"
            loading={loading}
            disabled={barcode.trim().length === 0}
            onPress={() => void loadProduct(barcode)}
          />
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={18} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {success ? (
          <View style={styles.successBox}>
            <Ionicons name="checkmark-circle" size={18} color={colors.success} />
            <Text style={styles.successText}>{success}</Text>
          </View>
        ) : null}

        {product ? (
          <>
            <ProductCard product={product} />

            <View style={styles.stockCard}>
              <View style={styles.stockHeader}>
                <View>
                  <Text style={styles.stockLabel}>Stock actual</Text>
                  <Text style={styles.stockValue}>
                    {formatQuantity(product.stock?.quantity ?? 0)} uds.
                  </Text>
                  <Text style={styles.stockUpdated}>
                    {formatDateTime(product.stock?.updatedAt ?? null)}
                  </Text>
                </View>
                <StockBadge quantity={product.stock?.quantity ?? 0} />
              </View>

              <View style={styles.divider} />

              <Text style={styles.sectionTitle}>Nueva cantidad</Text>
              <View style={styles.quantityRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Restar una unidad"
                  style={styles.stepButton}
                  onPress={() => setQuantityValue(Number(quantity || 0) - 1)}
                >
                  <Ionicons name="remove" size={22} color={colors.brand} />
                </Pressable>
                <AppTextInput
                  value={quantity}
                  onChangeText={(value) => {
                    setQuantity(value.replace(/\D/g, ''));
                    setSuccess(null);
                  }}
                  keyboardType="number-pad"
                  maxLength={7}
                  containerStyle={styles.quantityField}
                  style={styles.quantityInput}
                  editable={!saving}
                  accessibilityLabel="Nueva cantidad de stock"
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Sumar una unidad"
                  style={styles.stepButton}
                  onPress={() => setQuantityValue(Number(quantity || 0) + 1)}
                >
                  <Ionicons name="add" size={22} color={colors.brand} />
                </Pressable>
              </View>

              <AppButton
                label="Guardar stock"
                icon="save-outline"
                loading={saving}
                onPress={() => void save()}
              />
              <Text style={styles.hint}>
                El cambio queda auditado en los logs del backend con tu usuario.
              </Text>
            </View>
          </>
        ) : null}
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
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
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.successSoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  successText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.success,
    fontWeight: '600',
  },
  stockCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  stockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  stockLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  stockValue: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
  },
  stockUpdated: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stepButton: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityField: {
    flex: 1,
  },
  quantityInput: {
    textAlign: 'center',
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  hint: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textAlign: 'center',
  },
});

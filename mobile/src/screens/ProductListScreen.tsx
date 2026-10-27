import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { EmptyState, ErrorState, LoadingState } from '../components/StateViews';
import { ProductCard } from '../components/ProductCard';
import { SearchBar } from '../components/SearchBar';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import type { ProductsStackParamList } from '../navigation/types';
import { useProductStore } from '../store/product.store';
import { colors, fontSize, spacing } from '../theme';

type Props = NativeStackScreenProps<ProductsStackParamList, 'ProductList'>;

export function ProductListScreen({ navigation }: Props) {
  const items = useProductStore((state) => state.items);
  const loading = useProductStore((state) => state.loading);
  const error = useProductStore((state) => state.error);
  const load = useProductStore((state) => state.load);

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 400);

  useEffect(() => {
    void load(debouncedSearch);
  }, [debouncedSearch, load]);

  const showFullScreenError = Boolean(error) && items.length === 0;
  const showInitialLoading = loading && items.length === 0;

  return (
    <View style={styles.container}>
      <View style={styles.searchWrapper}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          loading={loading && search.trim().length > 0}
        />
      </View>

      {showInitialLoading ? (
        <LoadingState message="Buscando productos…" />
      ) : showFullScreenError ? (
        <ErrorState
          message={error ?? ''}
          onRetry={() => {
            void load(debouncedSearch);
          }}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.barcode}
          renderItem={({ item }) => (
            <ProductCard
              product={item}
              onPress={(barcode) => navigation.navigate('ProductDetail', { barcode })}
            />
          )}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={Separator}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={loading && items.length > 0}
              onRefresh={() => {
                void load(debouncedSearch);
              }}
              colors={[colors.brand]}
              tintColor={colors.brand}
            />
          }
          ListHeaderComponent={
            <Text style={styles.listTitle}>
              {debouncedSearch ? `Resultados para “${debouncedSearch}”` : 'Productos recientes'}
            </Text>
          }
          ListEmptyComponent={
            <EmptyState
              icon={debouncedSearch ? 'search-outline' : 'basket-outline'}
              title={debouncedSearch ? 'Sin resultados' : 'Todavía no hay productos'}
              message={
                debouncedSearch
                  ? 'Prueba con otro nombre, marca o introduce el código de barras completo.'
                  : 'Busca un producto por nombre o código de barras para empezar.'
              }
            />
          }
        />
      )}
    </View>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchWrapper: {
    padding: spacing.lg,
    paddingBottom: spacing.sm,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    flexGrow: 1,
  },
  listTitle: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  separator: {
    height: spacing.sm,
  },
});

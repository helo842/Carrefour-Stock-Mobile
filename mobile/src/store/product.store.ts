import { create } from 'zustand';
import { getErrorMessage } from '../api/errors';
import { fetchProducts } from '../api/products';
import type { ProductWithStock } from '../types/api';

interface ProductState {
  items: ProductWithStock[];
  query: string;
  loading: boolean;
  error: string | null;
  load: (query: string) => Promise<void>;
  reset: () => void;
}

let activeRequest = 0;

export const useProductStore = create<ProductState>((set) => ({
  items: [],
  query: '',
  loading: false,
  error: null,

  load: async (query) => {
    const requestId = ++activeRequest;
    const normalized = query.trim();

    set({ loading: true, error: null, query: normalized });

    try {
      const items = await fetchProducts({
        ...(normalized ? { q: normalized } : {}),
        limit: 30,
      });
      if (requestId !== activeRequest) return;
      set({ items, loading: false });
    } catch (error) {
      if (requestId !== activeRequest) return;
      set({ items: [], loading: false, error: getErrorMessage(error) });
    }
  },

  reset: () => {
    activeRequest += 1;
    set({ items: [], query: '', loading: false, error: null });
  },
}));

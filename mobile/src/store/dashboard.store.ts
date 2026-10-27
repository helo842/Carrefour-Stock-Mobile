import { create } from 'zustand';
import { fetchDashboard } from '../api/dashboard';
import { getErrorMessage } from '../api/errors';
import type { Dashboard } from '../types/api';

interface DashboardState {
  data: Dashboard | null;
  loading: boolean;
  error: string | null;
  load: () => Promise<void>;
}

let activeRequest = 0;

export const useDashboardStore = create<DashboardState>((set) => ({
  data: null,
  loading: false,
  error: null,

  load: async () => {
    const requestId = ++activeRequest;
    set({ loading: true, error: null });

    try {
      const data = await fetchDashboard();
      if (requestId !== activeRequest) return;
      set({ data, loading: false });
    } catch (error) {
      if (requestId !== activeRequest) return;
      set({ loading: false, error: getErrorMessage(error) });
    }
  },
}));

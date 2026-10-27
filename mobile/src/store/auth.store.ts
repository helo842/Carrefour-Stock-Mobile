import { create } from 'zustand';
import { ApiError, getErrorMessage } from '../api/errors';
import { fetchMe } from '../api/users';
import {
  mapAuthError,
  signInWithEmail,
  signOut as signOutFromFirebase,
  subscribeToAuthState,
} from '../services/auth';
import type { UserProfile } from '../types/api';
import { useProductStore } from './product.store';

export type AuthStatus = 'booting' | 'signedOut' | 'loadingProfile' | 'signedIn' | 'error';

interface AuthState {
  status: AuthStatus;
  profile: UserProfile | null;
  error: string | null;
  signingIn: boolean;
  initialize: () => () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  retryProfile: () => Promise<void>;
}

let unsubscribe: (() => void) | null = null;
let profileRequest = 0;

type SetState = (partial: Partial<AuthState>) => void;

async function loadProfile(set: SetState): Promise<void> {
  const requestId = ++profileRequest;
  set({ status: 'loadingProfile', error: null });

  try {
    const profile = await fetchMe();
    if (requestId !== profileRequest) return;
    set({ status: 'signedIn', profile });
  } catch (error) {
    if (requestId !== profileRequest) return;

    if (error instanceof ApiError && error.code === 'USER_NOT_PROVISIONED') {
      // Authenticated in Firebase but not authorized for this app.
      await signOutFromFirebase().catch(() => undefined);
      set({ status: 'signedOut', profile: null, error: error.message });
      return;
    }

    set({ status: 'error', error: getErrorMessage(error) });
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'booting',
  profile: null,
  error: null,
  signingIn: false,

  initialize: () => {
    if (unsubscribe) return unsubscribe;

    unsubscribe = subscribeToAuthState((user) => {
      if (!user) {
        set({ status: 'signedOut', profile: null });
        return;
      }
      void loadProfile(set);
    });

    return () => {
      unsubscribe?.();
      unsubscribe = null;
    };
  },

  signIn: async (email, password) => {
    set({ signingIn: true, error: null });
    try {
      await signInWithEmail(email, password);
    } catch (error) {
      set({ signingIn: false, error: mapAuthError(error) });
      return;
    }
    set({ signingIn: false });
  },

  signOut: async () => {
    try {
      await signOutFromFirebase();
    } finally {
      profileRequest += 1;
      useProductStore.getState().reset();
      set({ status: 'signedOut', profile: null, error: null, signingIn: false });
    }
  },

  retryProfile: async () => {
    await loadProfile(set);
  },
}));

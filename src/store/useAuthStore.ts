import { create } from 'zustand';
import {
  fetchMe,
  loginApi,
  logoutApi,
  requestRegistrationCode,
  verifyRegistrationCode,
  type AuthUser
} from '../api/auth';
import { setAccessToken } from '../api/client';

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  pendingRegistrationEmail: string;
  emailForCode: string;
  init: () => Promise<void>;
  registerRequestCode: (name: string, email: string, password: string) => Promise<void>;
  registerVerifyCode: (code: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  pendingRegistrationEmail: '',
  emailForCode: '',

  init: async () => {
    try {
      const me = await fetchMe();
      set({ user: me.user, isLoading: false });
    } catch {
      setAccessToken(null);
      set({ user: null, isLoading: false });
    }
  },

  registerRequestCode: async (name, email, password) => {
    const normalizedEmail = email.trim().toLowerCase();
    const result = await requestRegistrationCode(name, normalizedEmail, password);
    if (result.requiresEmailVerification) {
      set({ emailForCode: normalizedEmail, pendingRegistrationEmail: normalizedEmail });
      return;
    }

    if (result.accessToken && result.user) {
      setAccessToken(result.accessToken);
      set({ user: result.user, pendingRegistrationEmail: '', emailForCode: '' });
    }
  },

  registerVerifyCode: async (code) => {
    const { pendingRegistrationEmail } = get();
    const payload = await verifyRegistrationCode(pendingRegistrationEmail, code);
    setAccessToken(payload.accessToken);
    set({ user: payload.user, pendingRegistrationEmail: '', emailForCode: '' });
  },

  login: async (email, password) => {
    const payload = await loginApi(email.trim().toLowerCase(), password);
    setAccessToken(payload.accessToken);
    set({ user: payload.user });
  },

  logout: async () => {
    try {
      await logoutApi();
    } finally {
      setAccessToken(null);
      set({ user: null, emailForCode: '', pendingRegistrationEmail: '' });
    }
  }
}));

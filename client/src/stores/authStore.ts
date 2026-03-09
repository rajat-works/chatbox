import { create } from 'zustand';
import { User, ThemeMode } from '../types';
import { authAPI, usersAPI } from '../services/api';
import socketService from '../services/socket';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  theme: ThemeMode;

  // Actions
  login: (email: string, password: string) => Promise<any>;
  register: (data: { name: string; email: string; password: string; confirmPassword: string }) => Promise<any>;
  verifyOtp: (email: string, otp: string) => Promise<any>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  updateUser: (data: Partial<User>) => void;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: !!localStorage.getItem('accessToken'),
  isLoading: true,
  theme: (localStorage.getItem('theme') as ThemeMode) || 'light',

  login: async (email: string, password: string) => {
    const { data } = await authAPI.login({ email, password });

    if (data.requiresVerification) {
      return data;
    }

    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);

    // Connect sockets
    socketService.connectChat(data.accessToken);
    socketService.connectCalls(data.accessToken);

    set({ user: data.user, isAuthenticated: true });
    return data;
  },

  register: async (formData) => {
    const { data } = await authAPI.register(formData);
    return data;
  },

  verifyOtp: async (email: string, otp: string) => {
    const { data } = await authAPI.verifyOtp({ email, otp });

    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);

    socketService.connectChat(data.accessToken);
    socketService.connectCalls(data.accessToken);

    set({ user: data.user, isAuthenticated: true });
    return data;
  },

  logout: async () => {
    try {
      await authAPI.logout();
    } catch (e) {
      // ignore
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    socketService.disconnectAll();
    set({ user: null, isAuthenticated: false });
  },

  loadUser: async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        set({ isLoading: false, isAuthenticated: false });
        return;
      }

      const { data } = await usersAPI.getProfile();

      socketService.connectChat(token);
      socketService.connectCalls(token);

      set({ user: data, isAuthenticated: true, isLoading: false });
    } catch {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  updateUser: (data: Partial<User>) => {
    const currentUser = get().user;
    if (currentUser) {
      set({ user: { ...currentUser, ...data } });
    }
  },

  setTheme: (theme: ThemeMode) => {
    localStorage.setItem('theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    set({ theme });
  },

  toggleTheme: () => {
    const newTheme = get().theme === 'light' ? 'dark' : 'light';
    get().setTheme(newTheme);
  },
}));

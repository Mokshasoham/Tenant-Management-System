import { create } from 'zustand';
import { authService } from '../services/api';

const useAuthStore = create((set) => ({
  user: null,
  token: null,
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authService.login({ email, password });
      localStorage.setItem('authToken', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      set({ user: response.data.user, token: response.data.token, isLoading: false });
      return response;
    } catch (error) {
      const errorMsg = error?.message || 'Login failed';
      set({ error: errorMsg, isLoading: false });
      throw error;
    }
  },

  register: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authService.register(data);
      localStorage.setItem('authToken', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      set({ user: response.data.user, token: response.data.token, isLoading: false });
      return response;
    } catch (error) {
      const errorMsg = error?.message || 'Registration failed';
      set({ error: errorMsg, isLoading: false });
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    set({ user: null, token: null, error: null });
  },

  initializeAuth: () => {
    const token = localStorage.getItem('authToken');
    const user = localStorage.getItem('user');
    if (token && user) {
      set({ token, user: JSON.parse(user) });
    }
  },

  updateProfile: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authService.updateProfile(data);
      localStorage.setItem('user', JSON.stringify(response.data));
      set({ user: response.data, isLoading: false });
      return response;
    } catch (error) {
      const errorMsg = error?.message || 'Update failed';
      set({ error: errorMsg, isLoading: false });
      throw error;
    }
  },

  isAuthenticated: () => {
    return !!localStorage.getItem('authToken');
  },

  isAdmin: () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user?.role === 'admin';
  },

  isManager: () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return ['admin', 'manager'].includes(user?.role);
  },

  isTenant: () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    // 'user' is the legacy role name — treat as tenant
    return ['tenant', 'user'].includes(user?.role);
  },

  forgotPassword: async (email) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authService.forgotPassword({ email });
      set({ isLoading: false });
      return response;
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || 'Failed to send reset email';
      set({ error: errorMsg, isLoading: false });
      throw new Error(errorMsg);
    }
  },

  resetPassword: async (token, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authService.resetPassword(token, { password });
      set({ isLoading: false });
      return response;
    } catch (error) {
      const errorMsg = error?.message || 'Failed to reset password';
      set({ error: errorMsg, isLoading: false });
      throw error;
    }
  },
}));

export default useAuthStore;

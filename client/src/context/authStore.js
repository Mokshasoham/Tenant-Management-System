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
      const resData = response?.data || response;
      
      if (resData?.requires2FA) {
        set({ isLoading: false });
        return { requires2FA: true, userId: resData.userId };
      }

      const token = resData?.token || response?.token;
      const user = resData?.user || response?.user;

      if (!token) {
        throw new Error('Authentication succeeded but no token was returned.');
      }

      localStorage.setItem('authToken', token);
      localStorage.setItem('user', JSON.stringify(user));
      set({ user, token, isLoading: false, error: null });
      return response;
    } catch (error) {
      const errorMsg = error?.message || (typeof error === 'string' ? error : 'Login failed. Please try again.');
      set({ error: errorMsg, isLoading: false });
      throw new Error(errorMsg);
    }
  },

  verify2FALogin: async (userId, token) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authService.verify2FALogin({ userId, token });
      const resData = response?.data || response;
      const authToken = resData?.token || response?.token;
      const user = resData?.user || response?.user;

      localStorage.setItem('authToken', authToken);
      localStorage.setItem('user', JSON.stringify(user));
      set({ user, token: authToken, isLoading: false, error: null });
      return response;
    } catch (error) {
      const errorMsg = error?.message || (typeof error === 'string' ? error : '2FA verification failed.');
      set({ error: errorMsg, isLoading: false });
      throw new Error(errorMsg);
    }
  },

  googleLogin: async (idToken, role) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authService.googleAuth(idToken, role);
      const resData = response?.data || response;

      if (resData?.requiresRoleSelection || response?.requiresRoleSelection) {
        set({ isLoading: false });
        return {
          requiresRoleSelection: true,
          googleProfile: resData?.googleProfile || response?.googleProfile,
          idToken,
        };
      }

      const token = resData?.token || response?.token;
      const user = resData?.user || response?.user;

      if (!token) {
        throw new Error('Google authentication succeeded but no token was returned.');
      }

      localStorage.setItem('authToken', token);
      localStorage.setItem('user', JSON.stringify(user));
      set({ user, token, isLoading: false, error: null });
      return response;
    } catch (error) {
      const errorMsg = error?.message || (typeof error === 'string' ? error : 'Google Login failed. Please try again.');
      set({ error: errorMsg, isLoading: false });
      throw new Error(errorMsg);
    }
  },

  register: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authService.register(data);
      const resData = response?.data || response;
      const token = resData?.token || response?.token;
      const user = resData?.user || response?.user;

      if (token) {
        localStorage.setItem('authToken', token);
        localStorage.setItem('user', JSON.stringify(user));
        set({ user, token, isLoading: false, error: null });
      } else {
        set({ isLoading: false, error: null });
      }
      return response;
    } catch (error) {
      const errorMsg = error?.message || (typeof error === 'string' ? error : 'Registration failed. Please try again.');
      set({ error: errorMsg, isLoading: false });
      throw new Error(errorMsg);
    }
  },

  logout: () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    localStorage.removeItem('tms_compare_properties');
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

  isTechnician: () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user?.role === 'technician';
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

  verifyEmail: async (token) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authService.verifyEmail(token);
      if (response.data.token && response.data.user) {
        localStorage.setItem('authToken', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        set({ user: response.data.user, token: response.data.token });
      }
      set({ isLoading: false });
      return response;
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || 'Failed to verify email';
      set({ error: errorMsg, isLoading: false });
      throw new Error(errorMsg);
    }
  },

  setUser: (user) => {
    localStorage.setItem('user', JSON.stringify(user));
    set({ user });
  },
}));

export default useAuthStore;


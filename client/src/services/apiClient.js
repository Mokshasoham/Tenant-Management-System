import axios from 'axios';

let defaultApiBase = 'http://localhost:5000/api';
if (typeof window !== 'undefined' && window.location && !['localhost', '127.0.0.1'].includes(window.location.hostname)) {
  defaultApiBase = 'https://tenant-management-backend-ohr6.onrender.com/api';
}

const envBase = import.meta.env.VITE_API_BASE_URL;
const API_BASE_URL = (envBase && !envBase.includes('localhost'))
  ? envBase
  : (typeof window !== 'undefined' && window.location && !['localhost', '127.0.0.1'].includes(window.location.hostname)
    ? 'https://tenant-management-backend-ohr6.onrender.com/api'
    : (envBase || defaultApiBase));

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // 60s timeout for cloud spin-ups
});

// Add token to requests & handle FormData headers
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Critical: When sending FormData, delete 'Content-Type' so Axios calculates multipart/form-data with boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Public route prefixes where 401 errors should NEVER trigger an automatic redirect to /login
const PUBLIC_ROUTE_PREFIXES = [
  '/',
  '/login',
  '/register',
  '/reset-password',
  '/verify-email',
  '/activate-account',
  '/property/verify',
  '/verify/property',
  '/dev/verification-gallery',
];

// Handle responses
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const requestUrl = error.config?.url || '';
    const isAuthEndpoint =
      requestUrl.includes('/auth/login') ||
      requestUrl.includes('/auth/google') ||
      requestUrl.includes('/auth/register') ||
      requestUrl.includes('/auth/login/2fa') ||
      requestUrl.includes('/health');

    // Only redirect to /login for session expiration on PROTECTED app routes
    if (error.response?.status === 401 && !isAuthEndpoint) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      
      if (typeof window !== 'undefined' && window.location) {
        const rawPath = window.location.pathname || '/';
        const currentPath = rawPath.replace(/\/+$/, '') || '/';
        
        const isPublicPath = PUBLIC_ROUTE_PREFIXES.some(prefix => {
          if (prefix === '/') return currentPath === '/';
          return currentPath.startsWith(prefix);
        });

        if (!isPublicPath) {
          window.location.href = '/login';
        }
      }
    }

    // Extract cleanest user-facing and debug error message
    const extractedMessage =
      error.response?.data?.message ||
      error.response?.data?.error ||
      (typeof error.response?.data === 'string' ? error.response.data : null) ||
      error.message ||
      'Server request failed. Please check your network connection.';

    const customError = new Error(extractedMessage);
    customError.status = error.response?.status;
    customError.data = error.response?.data;

    return Promise.reject(customError);
  }
);

export default apiClient;

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
  timeout: 30000,
});

// Add token to requests & handle FormData headers
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
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

// Handle responses
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error.response?.data || error.message);
  }
);

export default apiClient;

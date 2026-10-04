import { io } from 'socket.io-client';

let socketInstance = null;

/**
 * Returns a singleton Socket.IO client instance configured with the active auth token
 * and pointing to the production or local server.
 */
export const getSocket = () => {
  if (typeof window === 'undefined') return null;

  const token = localStorage.getItem('authToken') || localStorage.getItem('token');
  if (!token) {
    if (socketInstance) {
      socketInstance.disconnect();
      socketInstance = null;
    }
    return null;
  }

  if (socketInstance && socketInstance.connected) {
    return socketInstance;
  }

  const envBase = import.meta.env.VITE_API_BASE_URL;
  let apiBase = envBase || 'http://localhost:5000/api';
  if (typeof window !== 'undefined' && window.location && !['localhost', '127.0.0.1'].includes(window.location.hostname)) {
    apiBase = (envBase && !envBase.includes('localhost')) ? envBase : 'https://tenant-management-backend-ohr6.onrender.com/api';
  }

  const socketUrl = apiBase.endsWith('/api') ? apiBase.slice(0, -4) : apiBase;

  socketInstance = io(socketUrl, {
    auth: { token },
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
    timeout: 15000,
  });

  return socketInstance;
};

export const disconnectSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
};

export default getSocket;
